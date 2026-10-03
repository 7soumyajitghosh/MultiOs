export interface FSNode {
  name: string;
  type: 'folder' | 'file';
  children?: FSNode[];
  size?: string;
  modified?: string;
}

export const FS_ROOT: FSNode = {
  name: 'Macintosh HD',
  type: 'folder',
  children: [
    {
      name: 'Applications',
      type: 'folder',
      children: [
        { name: 'Aurora Browser.app', type: 'file', size: '84 MB', modified: 'Oct 1, 2026' },
        { name: 'Terminal.app', type: 'file', size: '12 MB', modified: 'Sep 28, 2026' },
        { name: 'Notes.app', type: 'file', size: '18 MB', modified: 'Sep 28, 2026' },
        { name: 'Calculator.app', type: 'file', size: '4 MB', modified: 'Sep 20, 2026' },
      ],
    },
    {
      name: 'Users',
      type: 'folder',
      children: [
        {
          name: 'maya',
          type: 'folder',
          children: [
            {
              name: 'Documents',
              type: 'folder',
              children: [
                { name: 'Roadmap 2026.md', type: 'file', size: '8 KB', modified: 'Today' },
                { name: 'Design tokens.json', type: 'file', size: '14 KB', modified: 'Yesterday' },
                { name: 'Q3 review.pdf', type: 'file', size: '2.1 MB', modified: 'Oct 1, 2026' },
              ],
            },
            {
              name: 'Desktop',
              type: 'folder',
              children: [
                { name: 'Screenshot 2026-10-01.png', type: 'file', size: '1.4 MB', modified: 'Oct 1' },
                { name: 'todo.txt', type: 'file', size: '1 KB', modified: 'Today' },
              ],
            },
            {
              name: 'Downloads',
              type: 'folder',
              children: [
                { name: 'aurora-wallpapers.zip', type: 'file', size: '48 MB', modified: 'Sep 30' },
                { name: 'prism-sdk.dmg', type: 'file', size: '210 MB', modified: 'Sep 29' },
              ],
            },
            {
              name: 'Pictures',
              type: 'folder',
              children: [
                { name: 'Dawn.heic', type: 'file', size: '3.2 MB', modified: 'Sep 12' },
                { name: 'Sequoia.heic', type: 'file', size: '4.1 MB', modified: 'Sep 10' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'System',
      type: 'folder',
      children: [
        { name: 'Library', type: 'folder', children: [] },
        { name: 'prismkernel', type: 'file', size: '2.4 MB', modified: 'Sep 15' },
      ],
    },
  ],
};

export function findNode(path: string[]): FSNode | null {
  let cur: FSNode = FS_ROOT;
  for (const seg of path) {
    if (!cur.children) return null;
    const next = cur.children.find((c) => c.name === seg);
    if (!next) return null;
    cur = next;
  }
  return cur;
}
