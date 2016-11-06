---
layout: post
title: "Make-macOS-App-With-Sunus-Part-1-Create-Window"
date: 2016-11-06 12:41
comments: true
categories: 
---

# 和 Sunus 一起开发 macOS App - 创建一个 Window

有「和 Sunsu 一起开发 macOS App」这一系列 Blog 的想法已经有一阵子了, 希望能坚持下来:)

## 创建 Window

创建 Window 是一个 macOS App 非常基础的一个部分, 在 macOS 的开发当中, Window 的使用范围比 iOS 要大得多也更加灵活, 所以我选择该系列的第一章就由创建 Window开始.

### 默认的 Window

打开 Xcode , 新建项目的项目, 会有一个默认的 Window 提供, 我之前都没怎么注意, 是这样的

![Default_Window](images/Default_Window.png)

这个 Window 初看起来也还好, 但是有时候我们会有一些希望能够自定义的地方. 这是 Xcode 的 GUI 界面就显得有些不够用了. 我们接下来会详细的研究如何通过代码来自定义我们的 Window.

### Window 的基础知识 

在 macOS 当中, 窗口一共由几个部分组成

1. TitleBar
2. ToolBar
3. 主体区域

默认情况下,这三个区域, 如图显示是这样(黑色边框的部分是 Toolbar)

![Window_Layout](images/window_layout.png)

* 要显示 Toolbar 需要实现 __NSToolbarDelegate__ 里的几个方法

### 开始用代码定制一个 Window

我们希望实现一个这样的 Window

![Window_Demo](images/window_demo.png)

看着还不错😋

实现一个这样的 Window, 初步看来, 需要几个地方稍加改动:

1. TitleBar 透明处理
2. TitleBar 的 Title 隐藏
3. Toolbar 不显示
4. 设置背景图片
5. 实现无边框的 TextField

其实看来 应该也就是 1~3 需要弄下, 4比较简单. 5不在本文的讨论范围内. 那么, 开始吧.
在详细一点, 我们需要做的就是设置 Titlebar , ToolBar, 以及 Window 的一些通用属性(背景等)
并且 Window 的一些属性, 虽然看起来像是属于 __TitleBar__ 的, __其实是通过 NSWindow 的styleMask__ 进行修改的, 在之后相关的地方也会一并说明.

#### TitleBar

##### 为什么要 TitleBar
关于 TitleBar 可能会问, 「看着最终效果, 好似不需要 Titlebar 吖?」

其实, Titlebar 做的不只是显示自己这个事情, 只要使用了 TitleBar, 他还让 Window 附带了:

1. 圆角边框 + 阴影效果
2. 能够支持鼠标在 TitleBar 区域的拖拽移动位置的效果

* 如果实在不想用 Titlebar, 那么你需要自己实现一个 __圆角的边框(如果需要)__ , __边框阴影效果(如果需要)__ , __支持拖拽(如果需要)__ , 还是比较麻烦的.

所以, 使用 Titlebar 还是能够得到很多附加的便利的:) 

##### 深入 Titlebar
关于 TitleBar , 有几个属性/方法值得留意:

```
@property (copy) NSString *title;
@property BOOL titlebarAppearsTransparent;
@property NSWindowTitleVisibility titleVisibility;
```
 
其中 __titlebarAppearsTransparent__ 这个属性很好理解, 设置成 __YES__ 即可, 即让 Titlebar 透明.

然后, __titleVisibility__ 这个属性也比较好理解,就是是否显示 __Window__ 的 __Title(其实就是Title 所在的那个 TextField)__ 有两个可能值 ``NSWindowTitleVisible`` 和 ``NSWindowTitleHidden``

#### Toolbar
Toolbar 就没啥好说的, 默认是没有的.

如果需要创建的话 需要实现 __NSToolbarDelegate__ 里的几个方法

#### 设置背景图片
1. 通过修改 NSWindow 的 __backgroundColor__ 属性即可
```
self.backgroundColor = [NSColorcolorWithPatternImage:backgroundImage];
```
2. 这个时候, 你会发现 titlebar 的那一块会是比较突兀的灰色, 所以, 也需要把 titlebar 的 __titlebarAppearsTransparent__ 属性设置为 __YES__ , 即将 titlebar 设置为透明即可.

#### Textfield 和其他
实现一个无边框的 Textfield 暂时就不在本文的范围内了, 可以通过代码来查看:)

## END
就这样, 一个还算好看的 Window 就开发好了, 我们可以继续接下来的开发了:)

## Feedback
关于本文任何问题可以留言:)
