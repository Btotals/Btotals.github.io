#guide 新手指引

##1. 引入
```
var Guide = require('lib/guide/guide.js');
```

##2. 准备工作

需要出现指引的HTML元素添加专用类名`js_guide_tip`，然后添加`tip-index`属性表示顺序，以及`tip-direction`表示tip提示的气泡方向。

```
<a href="#" class="js_guide_tip" tip-index="1" tip-direction="top">test text 1</a>
<a href="#" class="js_guide_tip" tip-index="2" tip-direction="right">test text 2</a>
```

然后是编写对应的文案，并使用`new`运算符创建guide实例。
```
var options = {
    1: {
        title: "添加企业号",
        text: "添加单个或导入多个企业号，与这些企业号进行信息互通",
        direction: "left" // 如果HTML中未声明，则此处可以声明；若同时声明，则以HTML为准。
    }, 2: {
        title: "添加企业号2",
        text: "添加单个或导入多个企业号，与这些企业号进行信息互通2"
    }
}

var guide = new Guide(options);
```

##3. 接口与使用

导航与控制方法：

* next/prev 方法导航到上一条/下一条；特别的：点击每一个tip的“下一步”都会调用guide.next导航至下一条。
* start/end 方法控制Guide导引开始/结束
* showTip/hideTip 方法控制当前tip的显示与隐藏
* 使用完成后调用destroy析构方法从页面上移除所有tip

提供on方法监听事件：

on的几个对应事件: destroy/start/end/tipShow/tipHide

从左往右，分别对应Guide被实例化、被析构、开始引导、结束引导、显示tip、隐藏tip

事件接口格式:
* .on(eventName, callback)
* .off([eventName] [,handlerId])
* .trigger(eventName)

监听guide的end事件并处理, handlerId存储传入handler函数对应的唯一Id值。

cb格式：@param {number} tipIndex 当前事件发生时当前tip的下标

on接口的使用： `var handlerId = guide.on('end', function(tipIndex){});`

off接口的使用：

* 移除所有handler: `guide.off();`
* 移除start事件的所有handler: `guide.off('start');`
* 移除某一个特定handler: `guide.off(handlerId);`

trigger接口的使用：`guide.trigger('start'); // 手动触发start事件的所有handler`

提供钩子方法`customConfig`，可以在传入的options内增加customConfig函数，实现某些自定义的配置

eg: 让组件在页面url的hash部分变化的时候destroy

```
customConfig: function() {
  var self = this;
  $(window).on('hashchange', function(){
    console.log('hashchange, guide would be destroy!');
    self.destroy();
  });
}
```
