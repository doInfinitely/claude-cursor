module.exports = {
  packagerConfig: {
    name: 'Claude Cursor',
    executableName: 'claude-cursor',
    icon: './assets/icon',
    asar: true,
    ...(process.env.APPLE_ID ? {
      osxSign: {},
      osxNotarize: {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_ID_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      },
    } : {}),
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
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: './assets/icon.icns',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Claude Cursor',
          homepage: 'https://github.com/anthropics/claude-cursor',
          icon: './assets/icon.png',
        },
      },
    },
  ],
};
