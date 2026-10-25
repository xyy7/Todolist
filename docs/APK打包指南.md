# 把待办事项做成安卓 App（小白版）

这份指南从头讲：下载什么、装什么、怎么打包出 `todolist.apk`、怎么装到手机。
照着做即可，不需要会安卓开发，也不需要 Android Studio。

---

## 你会得到什么

- 仓库根目录的 `todolist.apk`：装到安卓手机上就是一个叫「待办事项」的 App。
- 完全离线：网页、样式、脚本、烟花动画库都打在安装包里，不联网也能用。
- 数据存在手机本地（和浏览器版一样用 localStorage），不上传。

## 一句话原理

这个应用本来就是一个网页。安卓上有个叫 **WebView** 的组件，可以把它理解成「只能显示你自己网页的浏览器」。
我们做一个很小的安卓程序，一启动就用 WebView 打开打包进 APK 里的 `index.html`，于是网页就变成了 App。

仓库里的 `apk/` 目录就是这个小程序：

```
apk/
├── AndroidManifest.xml          # App 的身份证：包名、名称、图标、入口页面
├── src/com/worknlp/todolist/
│   └── MainActivity.java        # 唯一的一页代码：打开 WebView 并加载网页
├── res/                         # 应用名和启动图标
├── vendor/confetti.browser.min.js  # 烟花动画库（避免打包后还要联网）
├── build.ps1                    # 一键打包脚本
└── keystore.jks                 # 首次打包自动生成的签名证书（不要删）
```

---

## 准备工作

- 一台 Windows 电脑（Win10/Win11 都行）。
- 约 1GB 空闲磁盘、约 500MB 下载量、十几分钟时间。
- 不需要管理员权限，也不需要安装 Android Studio。

下面统一假设你把工具放在 `C:\android-build`，想放别处也可以，后面命令里换路径即可。

```
C:\android-build\
├── jdk\        # Java 运行环境
└── sdk\        # 安卓命令行工具
```

---

## 第 1 步：下载 JDK 17

打包工具本身就是 Java 程序，所以先要有 Java。

1. 打开清华镜像的 JDK 17 目录：

   <https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/>

2. 下载最新的那个 `OpenJDK17U-jdk_x64_windows_hotspot_*.zip`（约 180MB）。
3. 解压，把里面那一层文件夹改名成 `C:\android-build\jdk`。
   解压后应该是这样：`C:\android-build\jdk\bin\java.exe`。
4. 打开命令提示符验证：

   ```bat
   C:\android-build\jdk\bin\java.exe -version
   ```

   能看到 `openjdk version "17..."` 就成功了。

## 第 2 步：下载 Android 命令行工具

安卓打包要用的几个小工具（`aapt2`、`d8`、`apksigner` 等）都在里面。

1. 下载腾讯镜像的压缩包（约 150MB）：

   <https://mirrors.cloud.tencent.com/AndroidSDK/commandlinetools-win-11076708_latest.zip>

2. 解压后，目录结构必须长这样（这一步最容易放错）：

   ```
   C:\android-build\sdk\cmdline-tools\latest\bin\sdkmanager.bat
   ```

   压缩包里本身也有一层 `cmdline-tools`，所以要把它重命名成 `latest` 再放进去。

## 第 3 步：安装 Android 34 平台和打包工具

打开 **命令提示符（cmd）**，依次执行：

```bat
set JAVA_HOME=C:\android-build\jdk

C:\android-build\sdk\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\android-build\sdk "platforms;android-34" "build-tools;34.0.0"
```

- 过程中会问 `Accept? (y/N)`，输入 `y` 回车。
- 下载约 200MB，装完会看到 `sdk\platforms\android-34` 和 `sdk\build-tools\34.0.0` 两个文件夹。

> 用 PowerShell 的话，第一行改成：`$env:JAVA_HOME="C:\android-build\jdk"`

---

## 第 4 步：一键打包

在仓库根目录（能看到 `index.html` 的那一层）打开 PowerShell，执行：

```powershell
powershell -ExecutionPolicy Bypass -File apk\build.ps1 `
  -JdkPath C:\android-build\jdk `
  -SdkPath C:\android-build\sdk
```

> PowerShell 里换行用反引号 `` ` ``；嫌麻烦就写成一行：
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File apk\build.ps1 -JdkPath C:\android-build\jdk -SdkPath C:\android-build\sdk
> ```

脚本会依次做 6 件事，看到 `[6/6] 输出：...todolist.apk` 就成功了：

| 步骤 | 做什么 | 用到的工具 |
|---|---|---|
| 1/6 | 把 `index.html`、`style.css`、`app.js` 复制进 `assets`，并把 CDN 上的烟花库换成本地文件 | 无 |
| 2/6 | 把 `MainActivity.java` 编译成 Java 字节码 | `javac` |
| 3/6 | 把字节码转换成安卓认识的 `classes.dex` | `d8` |
| 4/6 | 打包清单、图标、资源和网页文件，并对齐 | `aapt2`、`jar`、`zipalign` |
| 5/6 | 用本地自签证书给 APK 签名 | `keytool`、`apksigner` |
| 6/6 | 输出 `todolist.apk` | 无 |

首次运行会自动生成 `apk\keystore.jks`（签名证书）。

---

## 第 5 步：装到手机

**方法 A：用数据线（推荐）**

1. 手机打开「开发者选项 → USB 调试」，用数据线连电脑。
2. 在仓库根目录执行：

   ```bat
   adb install todolist.apk
   ```

   没装 adb 的话，用手机厂商助手或方法 B 也行。

**方法 B：直接传文件**

1. 把 `todolist.apk` 用微信/QQ/网盘/数据线拷到手机。
2. 用手机文件管理器点开它。
3. 系统提示「禁止安装未知应用」时，按提示给文件管理器打开「允许安装」权限，再装。

装好后桌面会出现蓝色圆形对勾图标，名字是「待办事项」。

---

## 改了网页代码后怎么重新打包

改完 `index.html` / `style.css` / `app.js` 后，重新执行第 4 步那条命令即可，几十秒完成。

注意两点：

- **不要删 `apk\keystore.jks`**。删了下次会生成新证书，手机上已装的旧版因为签名不同，必须先卸载才能装新版。
- 如果改了应用名或图标：应用名在 `apk\res\values\strings.xml`，图标在 `apk\res\mipmap-*\ic_launcher.png`。

---

## 常见问题

**提示 `未找到 JDK` 或 `JAVA_HOME`**
说明没有设置环境变量。打包命令里加 `-JdkPath C:\android-build\jdk` 即可。

**`javac` 报「编码 GBK 的不可映射字符」**
仓库里的 `build.ps1` 已经加了 `-encoding UTF-8`。如果你手动敲编译命令，记得也加上。

**装的时候提示 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`**
手机上装过签名不同的旧版本。先卸载旧版再安装。

**装完打开是白屏**
先确认 APK 里确实有网页文件：用压缩软件打开 APK，应能看到 `assets/index.html`。
如果自己改过网页，检查 `index.html` 里引用的脚本路径没有被改动。

**想上架应用商店**
当前用的是本地自签证书（口令都是 `todolist`），只适合自己用。上架需要正式签名、隐私政策等，另说。

---

## 安全与数据提醒

- APK 只申请了最基础的运行权限，不联网、不读取通讯录/相册/定位。
- 应用数据存在手机 App 的本地存储里，卸载 App 会一起删除。重要数据请用应用里的「导出」功能备份。
