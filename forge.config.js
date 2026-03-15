module.exports = {
  packagerConfig: {
    name: 'Claude Cursor',
    executableName: 'claude-cursor',
    asar: true,
    ignore: [
      /^\/frontend\/src/,
      /^\/frontend\/node_modules/,
      /^\/frontend\/public/,
      /^\/frontend\/vite\.config/,
      /^\/frontend\/package/,
      /^\/frontend\/index\.html/,
      /^\/\.env$/,
      /^\/\.git/,
      /^\/doc/,
      /^\/CONVERSATION\.md/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'claude-cursor',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Claude Cursor',
          homepage: 'https://github.com/anthropics/claude-cursor',
        },
      },
    },
  ],
};
