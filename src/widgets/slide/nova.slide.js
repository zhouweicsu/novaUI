/* 
 * @file novaUI Slide 组件
 * @name novaUI.slide
 * @desc 轮播组件
 * @import src/zepto.js, src/nova.ui.js
 * */
;(function($) {
    /*
     * Switcher类实例化时的初始化函数
     * @method init
     * @param {DOM} ele 组件对应的DOM元素
     * @param {JSON} config 组件配置
     *
     * */
	function init(ele, config) {
		this.index = config.index;	// 初始选项
		this.count = config.count;	// 选项个数
	}

    /*
     * Switcher类的原型属性和方法
     * */
	var prototype = {
        /* 默认配置 */
		_defaultConf: {
			index: -1,          // 初始选项
			count: 0,           // 选项个数
			recursive: false    // 是否可循环
		}, 

        /*
         * 切换到下一个
         * @method next
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		next: function() {
			var from = this.index, 
				to;
			// 可循环
			if(this.config.recursive) {
				to = (from + 1) % this.count;
				this.switchTo(to);
				this.trigger('next', [from, to]);
				return true;
			} 
			// 不可循环，但未超出范围
			else if((to = from + 1) < this.count){
				this.switchTo(to);
				this.trigger('next', [from, to]);
				return true;
			}

			return false;
		}, 

        /*
         * 切换到上一个
         * @method prev
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		prev: function() {
			var from = this.index, 
				to;
			// 可循环
			if(this.config.recursive) {
				to = (from + this.count - 1) % this.count;
				this.switchTo(to);
				this.trigger('prev', [from, to]);
				return true;
			} 
			// 不可循环，但未超出范围
			else if((to = from - 1) >= 0){
				this.switchTo(to);
				this.trigger('prev', [from, to]);
				return true;
			}

			return false;
		}, 
        /*
         * 切换到指定项
         * @method switchTo
         * @param {Integer} to 切换到项的索引
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		switchTo: function(to) {
			var from = this.index;
			if(from != to) {
				this.index = to;
				this.trigger('switch', [from, to]);
				return true;
			}
			return false;
		}
	};

    /*
     * 控制选项之间的切换 
     * @class Switcher
     * @param {DOM} ele 组件对应的DOM元素
     * @param {JSON} config 组件配置
     * */
	var Switcher = nova.ui.define(init, prototype);
	window.Switcher = Switcher;

})($);

;(function($) {
	var SWIPE_DISTANCE_MIN = 25, 
        TRANSFORM_PROPERTY_NAME = document.body.style.webkitTransform == undefined ? 'transform' : '-webkit-transform';

    /*
     * Slider类实例化时的初始化函数
     * @method init
     * @param {DOM} ele 组件对应的DOM元素
     * @param {JSON} config 组件配置
     *
     * */
	function init(ele, config) {
		var me = this;

		// DOM elements
		me.$root = me.root;
		me.$items = me.$root.find(config.contentsSelector);
		me.$controls = me.$root.find(config.controlsSelector);
		me.$cur = $(), 
		me.$prev = $(), 
		me.$next = $(), 
		me.$curControl = $();

		me.width = me.$items.parent().width(), 
		me.slideOffset = 0, 
		me.slideDuration = 0,
        me.autoplayTimerID;
 
		config.count = me.$items.length;
		config.index = 0;
		// switcher
		me.switcher = new Switcher(ele, 
			{
				recursive: config.recursive, 
				index: config.index, 
				count: config.count
			}
		);

		// Slide status
		me.slidingCount = 0;		// 0 indicates no element is sliding

		// Tapping Control event listeners
		me.$controls.delegate('.control-item', 'tap', function(ev) {
			ev.preventDefault();
			var index = me.$controls.indexOf(this);
			me.go(index);
		});

        // Resizing window event listener
        $(window).on('resize', function() {
		    me.width = me.$items.parent().width(); 
            me._resetReadyEles();
        });

        // Make slider draggable
		me.$items.on('touchstart', function(ev) {
			if(!me._notSliding()) return;
			var $ins = $(this), 
				touch = ev.touches[0], 
				startX = touch.pageX, 
				deltaX = 0, 
				startTime = new Date();
			$ins.on('touchmove', touchmoveHandler);
			$ins.on('touchend', touchendHandler);

			function touchmoveHandler(ev) {
				var curTouch = ev.touches[0];
				deltaX = Math.abs(curTouch.pageX - startX) < me.width ? (curTouch.pageX - startX) : deltaX;
				me.slideOffset = deltaX;
				
                $ins.css(TRANSFORM_PROPERTY_NAME, 'translate3d(' + deltaX + 'px, 0, 0)'); 
                me.$next.css(TRANSFORM_PROPERTY_NAME, 'translate3d(' + (me.width + deltaX) + 'px, 0, 0)'); 
                me.$prev.css(TRANSFORM_PROPERTY_NAME, 'translate3d(' + (-me.width + deltaX) + 'px, 0, 0)');
			} function touchendHandler(ev) { var rightToLeft = deltaX < 0, 
					endTime = new Date(), 
					swipeDuration = endTime - startTime, 
					swipeDistance = Math.abs(deltaX), 
					duration = Math.abs(me.slideOffset) * me.config.duration_ms / me.width;

				$ins.off('touchmove', touchmoveHandler);
				$ins.off('touchend', touchendHandler);

				if(swipeDistance >= SWIPE_DISTANCE_MIN) {
					if(!(rightToLeft ? me.next() : me.prev()))
						recur();
				} else {
					recur();
				}

				// 回到原位
				function recur() {
					me.slideOffset = 0;
					$ins.animate(me._getOffsetXCss(0), duration);					
					me.$prev.animate(me._getOffsetXCss(-me.width), duration);
					me.$next.animate(me._getOffsetXCss(me.width), duration);
				}
			}

		});

		// 如果小于三个选项，禁止循环
		if(me.$items.length < 3 ) {
			me.setRecursive(false);
		}

		// 选中第一项
		me._resetReadyEles();

        // 自动轮播
        if(config.autoplay) {
            me.startAutoplay();
        }

	}

    /*
     * Slider类的原型属性和方法
     *
     * */
	var prototype = {
		_defaultConf: {
			index: -1, 				// 初始选项
			count: 0, 				// 选项个数
			recursive: true, 		// 是否可循环
			autoplay: false, 			// 是否自动轮播
			interval_ms: 10000, 	// 自动轮播间隔
			duration_ms: 200, 		// 切换时长

			contentsSelector: '.slide-cont .cont-item', 		
			controlsSelector: '.slide-control .control-item', 
			activeClassName: 'active'
		}, 	

        /*
         * 切换到下一个
         * @method next
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		next: function() {
            var rightToLeft = true;
			if(this._notSliding() && this.switcher.next()) {
			    this._slide(rightToLeft);
				return true;
			}
			return false;
		}, 
        /*
         * 切换到上一个
         * @method prev
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		prev: function() {
            var rightToLeft = false;
			if(this._notSliding() && this.switcher.prev()) {
			    this._slide(rightToLeft);
				return true;
			}
			return false;
		}, 
        /*
         * 切换到指定项
         * @method go
         * @param {Integer} to 要切换到的项的索引
         * @return {Boolean} 是否切换成功 成功:true 失败: false
         * */
		go: function(to) {
			from = this.switcher.index;
			if(this._notSliding() && this.switcher.switchTo(to)) {
				this._slideTo(from, to);
				return true;
			}
			return false;
		}, 
        /*
         * 开始自动轮播
         * @method startAutoplay
         * */
        startAutoplay: function() {
            var me = this;
            me.config.auto = true;    
            me.autoplayTimerID = setInterval(function() {
               me.next(); 
            }, me.config.interval_ms);
        }, 
        /*
         * 关闭自动轮播
         * @method stopAutoplay
         * */
        stopAutoplay: function() {
            var me = this;
            me.config.auto = false;
            clearInterval(me.autoplayTimerID);
            me.autoplayTimerID = undefined;
        }, 
        /*
         * 设置是否可循环
         * @method setRecursive
         * @param {Boolean} isRecursive 
         *
         * */
        setRecursive: function(isRecursive) {
            this.config.recursive = isRecursive;
            this.switcher.config.recursive = isRecursive;
        }, 
        /*
         * 将下一个要显示的项放置好，再开始滑动
         * @method _slideTo
         * @param {Integer} from 原来项的索引
         * @param {Integer} to 后来项的索引
         * */
		_slideTo: function(from, to) {
			var rightToLeft = to > from, 
				$to = this.$items.eq(to);
			if(rightToLeft) {
				this._setNext($to);
			} else {
				this._setPrev($to);
			}
			this._slide(rightToLeft);
		}, 
        /*
         * 滑动
         * @method _slide 
         * @param {Boolean} rightToLeft 是否从右向左滑 
         * */
		_slide: function(rightToLeft) {
			var me = this, 
				$to = rightToLeft ? me.$next : me.$prev, 
				offset = rightToLeft ? -me.width : me.width, 
				duration = (me.width - Math.abs(me.slideOffset)) * me.config.duration_ms / me.width;

			me.slidingCount = 2;
			me.$cur.animate(me._getOffsetXCss(offset), duration, 'linear', function() {
				me.slidingCount--;
				if(me._notSliding()) me._resetReadyEles();
			});
			$to.animate(me._getOffsetXCss(0), duration, 'linear', function() {
				me.slidingCount--;
				if(me._notSliding()) me._resetReadyEles();
			});
		},

        /*
         * 将当前选项和前后选项放置到正确位置，准备滑动
         * @method _resetReadyEles
         *
         * */
		_resetReadyEles: function() {				
			var curIndex = this.switcher.index, 
				prevIndex = curIndex - 1, 
				nextIndex = curIndex + 1, 
				count = this.switcher.count, 
				activeClassName = this.config.activeClassName;

			this.$cur.removeClass(activeClassName);
			this.$next.removeClass(activeClassName);
			this.$prev.removeClass(activeClassName);
			this.$curControl.removeClass(activeClassName);

			if(this.config.recursive) {
				prevIndex = (prevIndex >= 0 ? prevIndex : count - 1);
				nextIndex = nextIndex < count ? nextIndex : 0;
			}

			// 不用$items.eq, 因为当index为负值时，eq(-1)会返回eq(0)。这里期望index为负时返回空
			this.$cur = $(this.$items[curIndex]);
			this.$prev = $(this.$items[prevIndex]);
			this.$next = $(this.$items[nextIndex]);
			this.$curControl = $(this.$controls[curIndex]);
			
			this.slideOffset = 0;
			this.$cur.addClass(activeClassName).css(this._getOffsetXCss(0));
			this.$next.addClass(activeClassName).css(this._getOffsetXCss(this.width));
			this.$prev.addClass(activeClassName).css(this._getOffsetXCss(-this.width));
			this.$curControl.addClass(activeClassName);
		}, 

        /*
         * 准备好右边的slide-item 
         * @method _setNext
         * @param {Zepto} $el slide-item
         * */
		_setNext: function($el) {
			var activeClassName = this.config.activeClassName;
			this.$next.removeClass(activeClassName);
			this.$next = $el;
			this.$next.addClass(activeClassName).css(this._getOffsetXCss(this.width));
		}, 
        /*
         * 准备好左边的slide-item 
         * @method _setPrev
         * @param {Zepto} $el slide-item
         * */
		_setPrev: function($el) {
			var activeClassName = this.config.activeClassName;
			this.$prev.removeClass(activeClassName);
			this.$prev = $el;
			this.$prev.addClass(activeClassName).css(this._getOffsetXCss(-this.width));
		}, 
		
        /*
         * 检查是否在滑动
         * @method _notSliding
         * @return {Boolean} true:已经停止滑动 false:正在滑动
         * */
		_notSliding: function() {
			return this.slidingCount == 0;
		}, 

        _getOffsetXCss: function(offsetX) {
            var cssObj = {};
            cssObj[TRANSFORM_PROPERTY_NAME] = 'translate3d(' + offsetX + 'px, 0, 0)'            
            return cssObj;
        }

	};
    /*
     * @class Slide
     * @param {DOM} ele 组件的Dom元素
     * @param {JSON} config 组件配置
     * */
	var Slide = nova.ui.define(init, prototype);
	window.Slide = Slide;
})($);