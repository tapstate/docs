import type { Folder, Node, Root } from 'fumadocs-core/page-tree';

// Keep pages and URLs intact while turning metadata sections into real folders.
function sections(nodes: Node[], prefix: string): Node[] {
  const result: Node[] = [];
  let section: Folder | undefined;
  for (const node of nodes) {
    if (node.type === 'separator') {
      section = {
        type: 'folder',
        $id: `${prefix}-${result.length}`,
        name: node.name === 'Set up and run' ? 'Build and run'
          : node.name === 'Interfaces' ? 'CLI and APIs' : node.name,
        collapsible: true,
        defaultOpen: false,
        children: [],
      };
      result.push(section);
    } else if (section) {
      section.children.push(node);
    } else {
      result.push(node);
    }
  }
  return result.filter((node) => node.type !== 'folder' || node.children.length > 0);
}

function expandable(node: Node): Node {
  if (node.type !== 'folder') {
    if (node.type !== 'page') return node;
    const labels: Record<string, string> = {
      '/docs/overview/order-state-demo': 'Order-state demo',
      '/docs/connectors': 'Overview',
    };
    return labels[node.url] ? { ...node, name: labels[node.url] } : node;
  }
  const { index, ...folder } = node;
  const children = index
    ? [{ ...index, name: 'Overview' }, ...node.children.filter((child) =>
        child.type !== 'page' || child.url !== index.url)]
    : node.children;
  return {
    ...folder,
    name: node.$ref?.folder === 'concepts' ? 'Concepts' : node.name,
    collapsible: true,
    children: sections(children, node.$id ?? 'docs-section').map(expandable),
  };
}

export function organizeDocsNavigation(root: Root): Root {
  const children = sections(root.children, 'docs-navigation').flatMap((section): Node[] => {
    if (section.type !== 'folder') return [expandable(section)];
    if (section.name === 'Product guides' || section.name === 'Build and operate') {
      return section.children.flatMap((node) =>
        node.type === 'folder' && node.$ref?.folder === 'guides'
          ? sections(node.children, 'docs-guides').map(expandable)
          : [expandable(node)]);
    }
    if (section.name === 'Releases') return section.children.map(expandable);
    if (section.name === 'Developers and AI') {
      return [{
        ...section,
        children: section.children.flatMap((node) =>
          node.type === 'folder' && node.$ref?.folder === 'reference'
            ? sections(node.children, 'docs-reference').map(expandable)
            : [expandable(node)]),
      }];
    }
    return [expandable({ ...section, defaultOpen: section.name === 'Get started' })];
  });
  return { ...root, children };
}
