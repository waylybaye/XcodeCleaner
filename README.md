# Cleaner for Xcode

The new SwiftUI version is here https://github.com/waylybaye/XcodeCleaner-SwiftUI

---

![Screen Shot](./screenshot.png "Screenshot")


This app helps you to make your Xcode faster by removing unwanted and deprecated files.

You can run cleaner weekly or monthly to keep your developer folder health and to save more disk space.


这个应用可以帮助你清除遗留以及废弃文件，从而极大的节省硬盘空间. 你可以每月或者每周运行一次进行清理。



## Download

Cleaner for Xcode is available on Mac App Store now, you can get it using the link below. You can also build it by yourself, please refer to `Build` section.

[![Download on App Store](https://www.apple.com/itunes/link/images/link-badge-appstore.png "View on App Store")
](https://itunes.apple.com/app/cleaner-for-xcode/id1296084683)



## Build

Make sure you have latest `node` and `npm or yarn`  and `watchman` installed, you can install them using `homebrew`

1. Run `npm install` or `yarn` in project directory.
2. Run `open macos/XcodeCleaner.xcodeproj` to open Xcode project.
3. Disable `App Sandbox` in target's `Capabilities`.
4. Run!


----

## FAQ

#### 中国用户可能遇到的编译问题 (for Chinese users)

npm/yarn 安装过程会在 npmjs.com 下载库，这个网络会比较慢。编译过程中会去 github 和 sourceforge 下载依赖库。所以你需要一个系统全局的科学上网环境。


## LICENSE


You are permitted to use this
source code, with or without modification, in source or binary form, on
your devices however you see fit.  You are not permitted to redistribute
binaries of this source code, with or without modification.  In other
words, you cannot put this application or any application derived from
it, on the Apple App Store, Cydia, or any other binary-only distribution
channel.


