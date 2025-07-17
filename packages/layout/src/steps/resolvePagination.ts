import * as P from '@react-pdf/primitives';
import { compose, omit } from '@react-pdf/fns';
import FontStore from '@react-pdf/font';

import isFixed from '../node/isFixed';
import splitText from '../text/splitText';
import splitNode from '../node/splitNode';
import canNodeWrap from '../node/getWrap';
import getWrapArea from '../page/getWrapArea';
import getContentArea from '../page/getContentArea';
import createInstances from '../node/createInstances';
import shouldNodeBreak from '../node/shouldBreak';
import resolveTextLayout from './resolveTextLayout';
import resolveInheritance from './resolveInheritance';
import { resolvePageDimensions } from './resolveDimensions';
import { resolvePageStyles } from './resolveStyles';
import {
  DynamicPageProps,
  SafeDocumentNode,
  SafeLinkNode,
  SafeNode,
  SafePageNode,
  SafeTextNode,
  SafeViewNode,
  YogaInstance,
} from '../types';

const isText = (node: SafeNode): node is SafeTextNode => node.type === P.Text;

const assignChildren = <T>(children: SafeNode[], node: T): T =>
  Object.assign({}, node, { children });

const allFixed = (nodes: SafeNode[]) => nodes.every(isFixed);

const isDynamic = (
  node: SafeNode,
): node is SafeLinkNode | SafeTextNode | SafeViewNode =>
  node.props && 'render' in node.props;

const relayoutPage = compose(
  resolveTextLayout,
  resolvePageDimensions,
  resolveInheritance,
  resolvePageStyles,
);

const warnUnavailableSpace = (node: SafeNode) => {
  console.warn(
    `Node of type ${node.type} can't wrap between pages and it's bigger than available page height`,
  );
};

const splitNodes = (
  remainingHeight: number,
  contentArea: number,
  nodes: SafeNode[],
) => {
  const currentChildren: SafeNode[] = [];
  const nextChildren: SafeNode[] = [];

  const fixedNodes = nodes.filter(isFixed);
  const fixedNodesHeight = fixedNodes.reduce(
    (acc, node) =>
      node.box.height +
      (+node.box.marginBottom || 0) +
      (+node.box.marginTop || 0) +
      acc,
    0,
  );

  let remainingSpace = remainingHeight - fixedNodesHeight;

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const futureNodes = nodes.slice(i + 1);
    const futureFixedNodes = futureNodes.filter(isFixed);

    remainingSpace -= node.box.marginTop;
    remainingSpace -= node.box.marginBottom;

    if (isFixed(node)) {
      nextChildren.push(node);
      currentChildren.push(node);
      continue;
    }

    if (shouldNodeBreak(node, remainingSpace)) {
      const box = Object.assign({}, node.box, { top: 0 });
      const props = Object.assign({}, node.props, {
        wrap: true,
        break: false,
      });
      const next = Object.assign({}, node, { box, props });

      currentChildren.push(...futureFixedNodes);
      nextChildren.push(next, ...futureNodes);
      break;
    }

    if (remainingSpace >= node.box.height) {
      currentChildren.push(node);
      remainingSpace -= node.box.height;
      continue;
    }

    if (canNodeWrap(node)) {
      const [currentChild, nextChild] = split(
        node,
        remainingSpace,
        contentArea,
      );

      if (currentChild) currentChildren.push(currentChild);
      if (nextChild) nextChildren.push(nextChild);

      currentChildren.push(...futureFixedNodes);
      nextChildren.push(...futureNodes);

      break;
    }

    if (node.box.height > contentArea) {
      warnUnavailableSpace(node);
      continue;
    }
    nextChildren.push(node);
  }

  return [currentChildren, nextChildren];
};

const splitView = (
  node: SafeNode,
  remainingHeight: number,
  contentArea: number,
) => {
  const [currentNode, nextNode] = splitNode(node, remainingHeight);
  const [currentChildren, nextChildren] = splitNodes(
    remainingHeight - currentNode.box.paddingBottom - currentNode.box.paddingTop - currentNode.box.borderTopWidth - currentNode.box.borderBottomWidth,
    contentArea,
    node.children || [],
  );

  return [
    assignChildren(currentChildren, currentNode),
    assignChildren(nextChildren, nextNode),
  ];
};

const split = (node: SafeNode, remainingHeight: number, contentArea: number) =>
  isText(node)
    ? splitText(node, remainingHeight)
    : splitView(node, remainingHeight, contentArea);

const shouldResolveDynamicNodes = (node: SafeNode) => {
  const children = node.children || [];
  return isDynamic(node) || children.some(shouldResolveDynamicNodes);
};

const resolveDynamicNodes = (props: DynamicPageProps, node: SafeNode) => {
  const isNodeDynamic = isDynamic(node);

  // Call render prop on dynamic nodes and append result to children
  const resolveChildren = (children = []) => {
    if (isNodeDynamic) {
      const res = node.props.render(props);
      return (
        createInstances(res)
          .filter(Boolean)
          // @ts-expect-error rework dynamic nodes. conflicting types
          .map((n) => resolveDynamicNodes(props, n))
      );
    }

    return children.map((c) => resolveDynamicNodes(props, c));
  };

  // We reset dynamic text box so it can be computed again later on
  const resetHeight = isNodeDynamic && isText(node);
  const box = resetHeight ? { ...node.box, height: 0 } : node.box;

  const children = resolveChildren(node.children);

  // @ts-expect-error handle text here specifically
  const lines = isNodeDynamic ? null : node.lines;

  return Object.assign({}, node, { box, lines, children });
};

const resolveDynamicPage = (
  props: DynamicPageProps,
  page: SafePageNode,
  fontStore: FontStore,
  yoga: YogaInstance,
) => {
  if (shouldResolveDynamicNodes(page)) {
    const resolvedPage = resolveDynamicNodes(props, page);
    return relayoutPage(resolvedPage, fontStore, yoga);
  }

  return page;
};

const splitPage = (
  page: SafePageNode,
  pageNumber: number,
  fontStore: FontStore,
  yoga: YogaInstance,
): SafePageNode[] => {
  const contentArea = getContentArea(page);
  const dynamicPage = resolveDynamicPage({ pageNumber }, page, fontStore, yoga);
  const height = page.style.height;

  const [currentChilds, nextChilds] = splitNodes(
    contentArea,
    contentArea,
    dynamicPage.children,
  );

  const relayout = (node: SafePageNode): SafePageNode =>
    // @ts-expect-error rework pagination
    relayoutPage(node, fontStore, yoga) as SafePageNode;

  const currentBox = { ...page.box, height };
  const currentPage = relayout(
    Object.assign({}, page, { box: currentBox, children: currentChilds }),
  );

  if (nextChilds.length === 0 || allFixed(nextChilds))
    return [currentPage, null];

  const nextBox = omit('height', page.box);
  const nextProps = omit('bookmark', page.props);

  const nextPage = relayout(
    Object.assign({}, page, {
      props: nextProps,
      box: nextBox,
      children: nextChilds,
    }),
  );

  return [currentPage, nextPage];
};

const resolvePageIndices = (fontStore, yoga, page, pageNumber, pages) => {
  const totalPages = pages.length;

  const props = {
    totalPages,
    pageNumber: pageNumber + 1,
    subPageNumber: page.subPageNumber + 1,
    subPageTotalPages: page.subPageTotalPages,
  };

  return resolveDynamicPage(props, page, fontStore, yoga);
};

const assocSubPageData = (subpages) => {
  return subpages.map((page, i) => ({
    ...page,
    subPageNumber: i,
    subPageTotalPages: subpages.length,
  }));
};

const dissocSubPageData = (page) => {
  return omit(['subPageNumber', 'subPageTotalPages'], page);
};

const paginate = (
  page: SafePageNode,
  pageNumber: number,
  fontStore: FontStore,
  yoga: YogaInstance,
) => {
  if (!page) return [];

  if (page.props?.wrap === false) return [page];

  let splittedPage = splitPage(page, pageNumber, fontStore, yoga);

  const pages = [splittedPage[0]];
  let nextPage = splittedPage[1];

  while (nextPage !== null) {
    splittedPage = splitPage(
      nextPage,
      pageNumber + pages.length,
      fontStore,
      yoga,
    );

    pages.push(splittedPage[0]);
    nextPage = splittedPage[1];
  }

  return pages;
};

/**
 * Performs pagination. This is the step responsible of breaking the whole document
 * into pages following pagiation rules, such as `fixed`, `break` and dynamic nodes.
 *
 * @param root - Document node
 * @param fontStore - Font store
 * @returns Layout node
 */
const resolvePagination = (
  root: SafeDocumentNode,
  fontStore: FontStore,
): SafeDocumentNode => {
  let pages = [];
  let pageNumber = 1;

  for (let i = 0; i < root.children.length; i += 1) {
    const page = root.children[i];
    let subpages = paginate(page, pageNumber, fontStore, root.yoga);

    subpages = assocSubPageData(subpages);
    pageNumber += subpages.length;
    pages = pages.concat(subpages);
  }

  pages = pages.map((...args) =>
    dissocSubPageData(resolvePageIndices(fontStore, root.yoga, ...args)),
  );

  return assignChildren(pages, root);
};

export default resolvePagination;
