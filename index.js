define(function(require, exports, module) {
  var Guide = require("guide/guide");

  $(function() {
    var options = {
      1: {
        title: "1. 引入",
        text: "require lib中的guide.js",
        direction: "left" // 如果HTML中未声明，则此处可以声明；若同时声明，则以HTML为准。
      }, 2: {
        title: "2. 准备工作",
        text: "修改需要出现tip的HTML元素，添加必要的attr；编写对应的文案"
      }, 3: {
        title: "3. 接口与使用",
        text: "按照下面文档的接口说明使用即可"
      }
    };

    guide = new Guide("Guide demo", options);

    var startButton = $('#js_start_guide');

    startButton.click(function(e) {
      guide.on('start', function() {
        startButton.addClass('disabled');
      });

      guide.on('end', function() {
        startButton.removeClass('disabled');
      });

      guide.start();
    });

    guide.on('start', function() {
      console.log("Guide started");
    });

    guide.on('end', function() {
      console.log("Guide ended");
    });

  });

});
