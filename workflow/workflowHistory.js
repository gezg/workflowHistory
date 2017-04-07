!(function(){
	/**
	 *  流程历史实现类
	 */
	function WorkflowHistory(option){
		//缓存所有节点数据
		this.nodes = [];
		//初始化
		this.init(option);
	}

	WorkflowHistory.prototype = {
		init : function(option){
			this.option = this.util.extend({
				el: 'body',
				dataUrl: './data_line.json',
				canvasWidth: '100%',	//绘制面板容器的宽度
				canvasHeight: 800,		//绘制面板容器的高度
				width: 58,				//节点的宽度
				height: 58,				//节点的高度
				statusColors: ['' ,'#fbd136' ,'#d3edd4'], //流程状态的颜色
				skin: 'designer',		//流程节点的样式 modern和 designer两个参数,designer和设计器样式相同
				glow: '#ea9999',		//待办节点发光颜色, 基础颜色是statusColors[1]
				glowTime: 1000,			//蒙层光环单次执行闪烁时间
				glowWidth: 20			//蒙层光环宽度
			} ,option);

			this.getData(this.option.el);
		},
		//获取数据
		getData : function(element){
			var self = this;
			self.http({
				url: self.option.dataUrl,
			    type: "GET",
			    success: function (json) {
					var jsonObj = JSON.parse(json);
			    	this.createCanvas(element ,jsonObj.childShapes);
			    }
			});
		},
		http : function(config){
			var self = this;
		    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
		    xhr.open(config.type, config.url);
		    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		    xhr.onreadystatechange = function() {
		        if (xhr.readyState == 4) {
		            if (xhr.status == 200) {
		                config.success.call(self ,xhr.responseText);
		            }
		        }
		    }
		    xhr.send();
		},
		//创建画布
		createCanvas : function(ele ,datas){
			var opt = this.option,
			//创建一个画布
			paper = Raphael(ele, opt.canvasWidth, opt.canvasHeight);
			//先解析一遍数据,因为绘制路由时候会用到多有的流程节点数据
			this.parseData(datas);
			//开始 绘制
			this.draw(paper ,datas);
		},
		//创建图片节点
		createImgNode : function(paper ,shape , imgName ,isSub ,superNode){
			var opt = this.option,
			position = shape.bounds.upperLeft;
			//判断是不是子流程内的节点,如果是加上子流程的offset
			//因为子流程的的节点位置数据都是相对子流程的
			if(isSub){
				position.x = position.x + superNode.x;
				position.y = position.y + superNode.y;
			}

			var node = paper.image(
					'./image/'+ opt.skin +'/'+imgName+'.png', 
					position.x, 
					position.y, 
					opt.width, 
					opt.height
				);
			//绘制节点下方文字
			this.nodeText(paper ,shape.bounds.upperLeft.x ,shape.bounds.upperLeft.y ,shape.properties.name);

			//判断当前流程走到哪一个节点 - 添加颜色蒙层
			this.execute(paper ,shape);
			return node;
		},
		//创建子流程
		createSubProcess : function(paper ,shape){
			var position = shape.bounds;
			var width = position.lowerRight.x - position.upperLeft.x;
			var height= position.lowerRight.y - position.upperLeft.y;

			var sub = paper.rect(position.upperLeft.x, position.upperLeft.y, width, height, 10);
			sub.attr({
				'stroke':'#bbbbbb'
			});
			paper.text(position.upperLeft.x +30,position.upperLeft.y +20,shape.properties.name);
			//绘制子流程内部节点
			this.drawSub(shape.bounds.upperLeft ,paper ,shape.childShapes);
			return sub;
		},
		//创建路由
		createSequence : function(paper ,shape){
			var nodes = this.nodes;
			//获取 路由指向的节点
			var sourceNode = nodes[shape.target.resourceId];
			//获取指向当前路由的节点
			var targetNode = (function(nodes){
				var theNode = null;
				for(var key in nodes){
					if(nodes.hasOwnProperty(key)){
						for(var i = 0;i < nodes[key].outgoing.length;i++){
							var node = nodes[key].outgoing[i];
							if(node.resourceId === shape.resourceId){
								theNode = nodes[key];
							}
						}
					}
				}
				return theNode;
			})(this.nodes);

			if(sourceNode && targetNode){
				var dockers = shape.dockers;
				var startX,startY,endX,endY,diffX,diffY,diffSeqX,diffSeqY;
				var i = 0;len = dockers.length,isSeq = false;;

				startX = targetNode.bounds.upperLeft.x + dockers[0].x;
				startY = targetNode.bounds.upperLeft.y + dockers[0].y;
				endX   = sourceNode.bounds.upperLeft.x + dockers[len-1].x,
				endY   = sourceNode.bounds.upperLeft.y + dockers[len-1].y;

				diffX = startX,diffY = startY;
				diffSeqX = endX,diffSeqY = endY;

				for (;i < len;i++) {
					if(i != 0 && i < len -1){
						if(!isSeq){
							diffSeqX = dockers[i].x,diffSeqY = dockers[i].y;
							isSeq = true;
						}
						diffX = dockers[i].x,diffY = dockers[i].y;
					}
				};
				try{
					//截取获得路由绘制终点的坐标
					var ds = shape.line.split('L');
					//路由的位置
					var position = ds[ds.length-1].split(' ');
					//绘制箭头
					this.arrow(paper ,diffX ,diffY ,Number(position[0]) ,Number(position[1]) ,shape);
					//绘制路由线
					var line = paper.path(shape.line);
					//绘制路由线颜色
					this.lineColor(line);
					//绘制路由的文字
					this.lineText(paper ,shape ,diffX ,diffY ,Number(position[0]) ,Number(position[1]));
				}catch(e){
					throw new Error('路由节点数据异常! ' + e.message);
				}
			}
		},
		//节点下的文字
		nodeText : function(paper ,leftX , leftY,text){
			var x = leftX + 28;
			var y = leftY + 68;
			var s = paper.text(x ,y ,text);
		},
		lineText : function(paper ,shape ,sourceX ,sourceY ,targetX ,targetY){
			var textX = Number(shape.textPath[1]),
				textY = Number(shape.textPath[2]),
				rotate  = shape.textPath[0].replace(/rotate\(|\)/g,'').split(' ');


			var x = targetX - sourceX,
				y = targetY - sourceY,
				angle;
			if(x!=0){
				angle = Math.atan(y/x);
			} else {
				if(y>0){
					angle = Math.PI/2;
				} else {
					angle = Math.PI/2*3;
				}
			}
			// console.log(shape.properties.name);
			// console.log(angle);
			var text = paper.text(textX ,textY ,shape.properties.name);
			text.transform('r'+rotate[0]);
		},
		//路由的颜色
		lineColor : function(ele,isAow){
			ele.attr({
				'fill': isAow ? '#585858' : 'none',
				'stroke':'#585858',
				'stroke-width':2
			});
		},
		parseData : function(datas){
			var self = this;
			for(var i = 0; i < datas.length;i++){
				var shape = datas[i];
				var type = shape.stencil.id;
				if(type === 'SubProcess'){
					self.nodes[shape.resourceId] = shape;
					for(var k = 0; k < shape.childShapes.length;k++){
						var seq = shape.childShapes[k];
						self.nodes[seq.resourceId] = seq;
					}
				}else{
					self.nodes[shape.resourceId] = shape;
				}
			}
		},
		//绘制流程
		draw : function(paper ,datas){
			var self = this;
			for(var i = 0; i < datas.length;i++){
				var shape = datas[i];
				switch(shape.stencil.id){
					case 'StartNoneEvent':
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase());
						break;
					case 'EndNoneEvent' : 
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase());
						break;
					case 'UserTask' : 
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase());
						break;
					case 'InclusiveGateway' :
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase());
						break;
					case 'SubProcess':
						self.createSubProcess(paper ,shape);
						break;
					case 'SequenceFlow':
						self.createSequence(paper ,shape);
						break;
				}
			}
		},
		//绘制子流程,因为子流程内的节点是根据子流程定位,所有需要把子流程的位置信息带入
		drawSub : function(substitute ,paper ,datas){
			var self = this;
			for(var i = 0; i < datas.length;i++){
				var shape = datas[i];
				switch(shape.stencil.id){
					case 'StartNoneEvent':
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase() ,true ,substitute);
						break;
					case 'EndNoneEvent' : 
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase() ,true ,substitute);
						break;
					case 'UserTask' : 
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase() ,true ,substitute);
						break;
					case 'InclusiveGateway' :
						self.createImgNode(paper ,shape , shape.stencil.id.toLowerCase() ,true ,substitute);
						break;
				}
			}
		},
		//绘制箭头函数
		arrow : function(paper ,sourceX ,sourceY ,targetX ,targetY ,shape){
			var x = targetX - sourceX;
			var y = targetY - sourceY;
			var angle;
			if(x!=0){
				angle = Math.atan(y/x);
			} else {
				if(y>0){
					angle = Math.PI/2;
				} else {
					angle = Math.PI/2*3;
				}
			}
			//箭头宽
			var arrowLength = 11;
			//箭头高
			var arrowHeight = 8;
			//箭头底边中心点
			var bottomCenterY = targetY - arrowLength * Math.sin(angle);
			var bottomCenterX = targetX - arrowLength * Math.cos(angle);
			//x小于0则证明角度大于180° 取反坐标
			if (x < 0) {
			    bottomCenterY = targetY + arrowLength * Math.sin(angle);
			    bottomCenterX = targetX + arrowLength * Math.cos(angle);
			}
			//箭头左坐标点
			var bottomAngleAX = bottomCenterX - arrowHeight / 2 * Math.sin(angle);
			var bottomAngleAY = bottomCenterY + arrowHeight / 2 * Math.cos(angle);
			//箭头右坐标点
			var bottomAngleBX = bottomCenterX + arrowHeight / 2 * Math.sin(angle);
			var bottomAngleBY = bottomCenterY - arrowHeight / 2 * Math.cos(angle);
			//箭头坐标拼接
			var arrowPath = 'M ' + targetX + ' ' + targetY + ' L ' + bottomAngleAX + ' ' + bottomAngleAY + ' L ' + bottomAngleBX + ' ' + bottomAngleBY + 'z';
			//绘制箭头
			var arrow = paper.path(arrowPath);
			//箭头渲染颜色
			this.lineColor(arrow, true);
		},
		/**
		 * [节点覆盖蒙层]
		 * @param  {[Number]} 
		 *    status = 1   未办理节点
		 *    status = 2   待办节点
		 *    status = 3   已办节点
		 */
		execute : function(paper ,shape){
			var opt = this.option,
				status = parseInt(shape.properties.status ,10);
			if(status > 1){
				var position = shape.bounds.upperLeft;
				var radius = function(){
					var rd = 10;
					if(shape.stencil.id == 'StartNoneEvent' || shape.stencil.id == 'EndNoneEvent'){
						rd = 22;
					}
					return rd;
				}();
				//绘制蒙层
				var matte = paper.rect(
					position.x + (radius == 10 ? 1 : 4), 
					position.y + (radius == 10 ? 1 : 4), 
					opt.width - (radius == 10 ? 2 : 8), 
					opt.height - (radius == 10 ? 2 : 8), 
					radius
				);
			
				//为蒙层添加颜色
				matte.attr({
					'fill': opt.statusColors[status - 1],
					'stroke' : 'none',
					'fill-opacity' : .3
				});
				if(status === 2){
					this.glow(matte);
				}
			}
		},
		//待办节点的蒙层动画
		glow: function(matte) {
			var opt = this.option,
			//创建一个发光的蒙层
			glow = matte.glow({
				color: this.option.statusColors[1],
    			width: opt.glowWidth
			}),
			//定义动画
			anim = Raphael.animation({
				"stroke": opt.glow
			}, opt.glowTime);
			//设置动画最大值,一直反复执行
			anim = anim.repeat(Infinity);
			//给发光添加动画
			glow.animate(anim);
		},
		//工具方法
		util: {
			//扩展方法   Object.assign
			extend: function(target){
			    var target = Object(target);
				for (var index = 1; index < arguments.length; index++) {
				    var source = arguments[index];
				    if (source != null) {
				        for (var key in source) {
				            if (Object.prototype.hasOwnProperty.call(source, key)) {
				                target[key] = source[key];
				            }
				        }
				    }
				}
				return target;
			}
		}
	}
	//暴露给外部
	window.createHistory = function(option){
		return new WorkflowHistory(option);
	};
})();