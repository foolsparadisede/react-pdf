import { SafeNode } from '../types';
import getWrap from './getWrap';

const getBreak = (node: SafeNode) =>
  'break' in node.props ? node.props.break : false;

const shouldBreak = (
  child: SafeNode,
  remainingSpace: number,
) => {
  if ('fixed' in child.props) return false;

  const shouldSplit = remainingSpace < child.box.height;
  const canWrap = getWrap(child);

  return getBreak(child) || (shouldSplit && !canWrap);
};

export default shouldBreak;
