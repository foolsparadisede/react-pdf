import { isNil } from '@react-pdf/fns';

import { SafeNode } from '../types';

const hasFixedHeight = (node: SafeNode) => !isNil(node.style?.height);

const splitNode = (node: SafeNode, remainingHeight: number) => {
  if (!node) return [null, null];

  const current: SafeNode = Object.assign({}, node, {
    box: {
      ...node.box,
      borderBottomWidth: 0,
    },
    style: {
      ...node.style,
      marginBottom: 0,
      borderBottomWidth: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
  });

  current.style.height = remainingHeight;

  const nextHeight = hasFixedHeight(node)
    ? node.box.height - remainingHeight
    : null;

  const next: SafeNode = Object.assign({}, node, {
    box: {
      ...node.box,
      top: 0,
      borderTopWidth: 0,
    },
    style: {
      ...node.style,
      marginTop: 0,
      borderTopWidth: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
  });

  if (nextHeight) {
    next.style.height = nextHeight;
  }

  return [current, next];
};

export default splitNode;
