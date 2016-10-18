/**
* jquery.autocomplete.js
* 
* Copyright (c) 2016/5/20 Han Wenbo
*
**/

;(function($, window, document, undefined) {
    var plugName = "autocomplete",
        defaults = {
            prefix: '../../',//接口路径前缀(不能写根路径)
        	url: '',//[string]
            jsonp: false,//是否跨域
        	targetEl: null,//参照物(用于appendTo和定位)
        	posAttr: ['0px', '0px'],//外边框的定位[left bottom] 要写单位
        	itemNum: 0,//[int] 默认全部显示
        	keyupDelay: 5,//[int] 默认keyup之后，延时500ms后发送请求
            callback: function(data) {},//获取文本后的回调函数
        	callback: function(data) {},//获取文本后的回调函数
        };
    
    function Autocomplete($el, options) {
        this.plugName = plugName;
        this.$el = $el;
        this.prop = {};
        this.obj = {};
        this.$obj = {};
        this.defaults = defaults;
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    Autocomplete.prototype = {
        init: function() {
        	this.baseProp();//$el的基础属性
        	this.baseEl();//生成外边框
        	this.event();//绑定事件
        },
        //基础属性
        baseProp: function() {
        	this.prop.winW = $(window).width();
        	this.prop.winH = $(window).height();

        	this.prop.outerWidth = this.$el.outerWidth();
        	this.prop.outerHeight = this.$el.outerHeight();
        	this.prop.position = this.$el.position();
        	this.prop.offset = this.$el.offset();
        	
        	this.prop.bottom = this.prop.winH - this.prop.offset.top;
        	this.prop.boxSizing = this.$el.css('boxSizing');

        	//是否rem
        	this.prop.baseRem = parseInt($('html').css('fontSize'));
        },
        //生成外边框
        baseEl: function() {
            var style = 
                '.AU_outerCtn {'+
                    'border-radius: 5px 5px 0 0;'+
                    'background: #fff;'+
                    'position: absolute;'+
                    'border: 1px solid #d9d9d9;'+
                    'box-shadow: 0 0 20px 0 rgba(0, 0, 0, .15);'+
                    'z-index: 100000;'+
                    'width: 100%;'+
                '}'+
                '.AU_innerCtn {'+
                    'cursor: pointer;'+
                '}'+
                '.AU_innerCtn_focus {'+
                    'background: #e3f8ff;'+
                '}'+
                '.AU_txt {'+
                    'padding: 0 8px;'+
                    'line-height: 26px;'+
                '}';
            $('head').append('<style>'+ style +'</style>');
            
        	//rem
        	if(this.options.posAttr.join(',').indexOf('rem') != -1) {//rem
        		for(var i=0; i<this.options.posAttr.length; i++) {
        			this.options.posAttr[i] = parseFloat(this.options.posAttr[i]) * this.prop.baseRem;
        		}
        	}

        	this.$obj.$AU_outerCtn = $('<div class="AU_outerCtn"></div>').css({
        		left: this.options.posAttr[0],
        		bottom: this.options.posAttr[1],
        		boxSizing: this.prop.boxSizing,
        	}).hide().appendTo(this.options.targetEl);
        },
        //绑定事件
        event: function() {
        	var This = this;

        	This.obj.curIndex = 0;//当前选中的div

        	//文本改变(兼容ie9删除文本)
        	This.$el.on('input.AU, propertychange.AU, keyup.AU', function(e) {
        		if(e.type=='keyup') {
        			if(e.keyCode==8 && This.ieVersion==9) {//ie9下退格键
        				This.outerCtnEvent();
        			}
        			if(e.keyCode==38) {//上移
        				if(This.obj.curIndex == 0.5) {
        					This.obj.curIndex = This.obj.maxIndex;
        				}else {
        					if(This.obj.curIndex > 0) {
        						This.obj.curIndex--;
        					}else {
        						This.obj.curIndex = This.obj.maxIndex;
        					}
        				}
        				$('.AU_innerCtn').eq(This.obj.curIndex).addClass('AU_innerCtn_focus').siblings().removeClass('AU_innerCtn_focus');
        			}
        			if(e.keyCode==40) {//下移
        				if(This.obj.curIndex == 0.5) {
        					This.obj.curIndex = 0;
        				}else {
        					This.obj.curIndex = parseInt(This.obj.curIndex);
        					if(This.obj.curIndex < This.obj.maxIndex) {
        						This.obj.curIndex++;
        					}else {
        						This.obj.curIndex = 0;
        					}
        				}
        				$('.AU_innerCtn').eq(This.obj.curIndex).addClass('AU_innerCtn_focus').siblings().removeClass('AU_innerCtn_focus');
        			}
        			if(e.keyCode==27) {//取消
        				This.$obj.$AU_outerCtn.empty().hide();
        			}
        			if(e.keyCode==108 || e.keyCode== 13) {//确定
        				$('.AU_txt').eq(This.obj.curIndex).trigger('click');
        				This.$obj.$AU_outerCtn.empty().hide();
        			}
        		}else {
        			This.outerCtnEvent();
        		}
        	});

        	//选定
        	$(document).on('mouseover.AU', '.AU_innerCtn', function(e) {
        		if(e.type == 'mouseover') {
        			$(this).addClass('AU_innerCtn_focus').siblings().removeClass('AU_innerCtn_focus');

        			This.getCurIndex();
        		}
        	});

        	//取消
        	$(document).on('click.AU, touchend.AU', function(e) {
        		if(e.target != This.$el[0]) {//输入框
        			if($(e.target).is('.AU_txt')) {//选项
        				var data = $(e.target).text().match(/^\d+\. (.+)/)[1];

            			This.$el.val(data);
            			This.options.callback(data);
            		}
        			This.$obj.$AU_outerCtn.empty().hide();
        		}
        	});

        },
        //外框事件
        outerCtnEvent: function() {
        	var This = this;

    		This.obj.timerIndex = 0;
    		clearInterval(This.obj.timer);
    		This.obj.timer = setInterval(function() {
    			This.obj.timerIndex++;
    			if(This.obj.timerIndex == This.options.keyupDelay) {
    				This.request({
                    	prefix: This.options.prefix,//接口路径前缀(不能写根路径)
    					url: This.options.url,
    					params: {
    						q: This.$el.val(),
    					},
        				dataType: This.options.jsonp ? 'jsonp' : 'json',//默认json
    					callback: function(data) {
    						if(data.status) {//1
                                console && console.log(data.message);
    						}else {//0
    							var html = '';

    							if(data.list[0]) {
    								var len = This.options.itemNum ? (This.options.itemNum>data.list.length?data.list.length:This.options.itemNum) : data.list.length;
    								for(var i=0; i<len; i++) {
    									html += '<div class="AU_innerCtn"><div class="AU_txt">'+ (i+1) +'. '+ data.list[i].question +'</div></div>';

    								}
									This.obj.curIndex = 0.5;//恢复0
        							This.obj.maxIndex = len-1;//最大index
    								This.$obj.$AU_outerCtn.empty().append(html).show();
        							$('.AU_innerCtn').eq(This.obj.curIndex).addClass('AU_innerCtn_focus').siblings().removeClass('AU_innerCtn_focus');
    							}else {
    								This.$obj.$AU_outerCtn.empty().hide();
    							}
    						}
    					},
    				});
    				clearInterval(This.obj.timer);
    			}
    		}, 100);
        },
        //获取当前选中的div
        getCurIndex: function() {
        	var This = this;
        	
        	$('.AU_innerCtn').each(function(key, val) {
        		if($(val).is('.AU_innerCtn_focus')) {
        			This.obj.curIndex = key;
        		}
        	});
        },
        request: function(options) {  
            var This = this,  
                params = { //必须参数    
                    //    
                },  
                defaults = {  
                    prefix: '../../',  
                    //接口路径前缀(不能写根路径)    
                    $formObj: $(),  
                    //被序列化的form表单    
                    dataObj: {},  
                    callback: function() {},  
                    //回调函数    
                },  
                options = $.extend({}, defaults, options);  
            formData = $.extend({}, This.formatSeriData(decodeURIComponent((options.$formObj.serialize()))), options.dataObj); //中文乱码,使用decodeURIComponent解码即可    
            $.ajax({  
                url: encodeURI(options.prefix + (options.url || '...')),  
                //...为基础地址    
                type: 'get',  
                dataType: options.dataType || 'json',  
                data: $.extend({}, params, options.params, formData),  
                cache: false,  
                //IE下有用    
                success: function(data) {  
                    if (data) {  
                        options.callback(data);  
                    }  
                }  
            });  
        },
        //格式化被序列化后的数据->a=1&b=2化为{a:1, b:2}    
        formatSeriData: function(data) {  
            if (!data) {  
                return;  
            }  
            var obj = '',  
                dot = ',',  
                arr = data.match(/[^&]+/g);  

            for (var i = 0; i < arr.length; i++) {  
                var str = arr[i].match(/([^=]+)=([^=]*)/);  
                if (i == arr.length - 1) {  
                    dot = '';  
                }  
                obj += '"' + str[1] + '"' + ":" + '"' + str[2] + '"' + dot;  
            }  
            return JSON.parse('{' + obj + '}');  
        },
        //判断IE的版本(非ie返回undefined)    
        ieVersion: function() {  
            var browser = navigator.appName;  
            var b_version = navigator.appVersion;  
            var version = b_version.split(";");  
            var trim_Version = "";  
            if (!version[1]) return;  
            trim_Version = version[1].replace(/[ ]/g, "");  
            if (browser == "Microsoft Internet Explorer" && trim_Version == "MSIE6.0") {  
                return 6;  
            } else if (browser == "Microsoft Internet Explorer" && trim_Version == "MSIE7.0") {  
                return 7;  
            } else if (browser == "Microsoft Internet Explorer" && trim_Version == "MSIE8.0") {  
                return 8;  
            } else if (browser == "Microsoft Internet Explorer" && trim_Version == "MSIE9.0") {  
                return 9;  
            }  
        },
    }

    $.fn.extend({
        autocomplete: function(options) {
            return this.each(function() {
                new Autocomplete($(this), options);
            })
        }
    })
})(jQuery, window, document);