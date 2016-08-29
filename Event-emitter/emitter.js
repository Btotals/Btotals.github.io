var Emitter = (function(){
  Emitter.displayName = 'Emitter';
  var prototype = Emitter.prototype, constructor = Emitter;
  Emitter._sequenceArrayKey = Symbol('queueArrayKey');
  Emitter._sequenceIdKey = Symbol('sequence-id');

  /**
   * 简单的事件分派发射控制
   * @param {string} name    [名字]
   * @param {object} options [可选配置，留待将来扩展]
   */
  function Emitter(name, options){
    this.name = name;
    if (!options) {
      this.options = {};
    }
  }

  prototype._eventQueue = {};

  /**
   * 用于添加对应事件的handler
   * @param  {string} eventName [事件名称]
   * @param  {function} handler [事件的handler]
   * @return {symbol}           [用于唯一确定某个handler的Id]
   */
  prototype.on = function(eventName, handler){
    return this._addHandler(eventName, handler);
  };

  /**
   * 用于移除事件对应handler
   * @param  {string} eventName [要移除handler的事件]
   * @param  {symbol} handlerId [要被移除handler的Id]
   */
  prototype.off = function(eventName, handlerId){
    var targetQueue, name, queue;
    // 重新排列参数
    if (typeof eventName === 'symbol') {
      handlerId = eventName;
      eventName = undefined;
    }

    targetQueue = this._eventQueue[eventName];
    if (eventName === undefined) {
      // 如果两个参数均未提供，直接清空所有事件队列，相当于destroy
      if (handlerId === undefined) {
        this._eventQueue = {};
      } else {
        // 如果只提供handlerId，则搜索所有事件队列，移除对应的某个handler
        for (name in this._eventQueue) {
          queue = this._eventQueue[name];
          this._removeHandler(queue, queue[this.constructor._sequenceArrayKey], handlerId);
        }
      }
    } else if (targetQueue) {
      sequence = targetQueue[this.constructor._sequenceArrayKey];
      // 如果两个参数都有提供，那么在对应的事件队列中删除对应handler
      if (handlerId) {
        this.remove(targetQueue, sequence, handlerId);
      } else {
        // 否则清空eventName对应的事件队列
        var self = this;

        sequence.forEach(function(handlerId){
          self._removeHandler(targetQueue, sequence, handlerId);
        });
      }
    }

  };

  /**
   * 用于触发某个事件，执行事件队列中所有的handler，执行顺序与注册顺序一致
   * @param  {string} eventName [要被触发的事件名]
   * @param  {Any} data         [将被传入回调函数的数据]
   */
  prototype.trigger = function(eventName, data){
    var queue, sequenceArray;

    queue = this._eventQueue[eventName];
    if (!queue) return;

    sequenceArray = queue[this.constructor._sequenceArrayKey];
    sequenceArray.forEach(function(handlerId){
      queue[handlerId](data);
    });
  };

  // 用于析构，Alias for off()
  prototype.destroy = function() {
    this.off();
  }

  /**
   * 为事件队列注册handler
   * @param {string} eventName [要注册handler的事件名]
   * @param {function} handler [要注册的handler]
   * @return {symbol}          [注册的handler对应的唯一Id]
   */
  prototype._addHandler = function(eventName, handler){
    var queue, handlerId;
    queue = this._eventQueue[eventName];

    if (!queue) {
      // 保存handler的字典，键值对是{symbol: Function}
      this._eventQueue[eventName] = queue = {};
      // 用于记录handler注册顺序的数组
      queue[this.constructor._sequenceArrayKey] = [];
      queue[this.constructor._sequenceIdKey] = 0;
    }

    // handlerId: eventName#id, eg: showTip#1
    handlerId = Symbol(eventName + "#" + (queue[this.constructor._sequenceIdKey]++).toString());
    queue[handlerId] = handler;
    queue[this.constructor._sequenceArrayKey].push(handlerId);

    return handlerId;
  };

  /**
   * 根据handlerId移除事件队列中的handler
   * @param  {object} queue     [事件队列]
   * @param  {Array}  sequence  [保存handlerId的数组，用于记录handler注册的顺序]
   * @param  {symbol} handlerId [唯一标识某个handler的Id]
   * @return {boolean}          [是否成功移除]
   */
  prototype._removeHandler = function(queue, sequence, handlerId){
    if (queue[handlerId]) {
      delete queue[handlerId];
      sequence.splice(sequence.indexOf(handlerId));
      return true;
    }
    return false;
  };

  return Emitter;

}());
