(function sbmap(){
	var  dots = []
		// hashtags for each team
		,hashtags = {
			hawks: ["seahawks","gohawks","seattle","12thman","goseahawks","weare12","seattleseahawks","12s","12","hawks","twelfie","tb12","beastmode"]
			,patriots: ["patriots","patriots","patsnation","doyourjob","pats","newengland","newenglandpatriots","patriotsnation","gopatriots","finishthejob","tombrady","brady"]
			//,other: []
		}
		,sourceNames = { 'i': 'Instagram', 't': 'Twitter', 'other': 'Other'}
		,layers = ['hawks','patriots','other']
		// time frame 
		,startDate = new Date('2015-02-01T18:00:00+00:00')
		,endDate = new Date('2015-02-02T00:15:00+00:00')
		,imagePeriod = 10;

		console.log(startDate, endDate)
	// load data. It's better to change data format to csv to reduce loading time
	d3.csv('data/data.csv', function(error, data){
		var hcount, team, isTag = {};
		var follNum = {};
		follNum[layers[0]] = 0;
		follNum[layers[1]] = 0;
		var stamp, startStamp, prevStamp = 0;
		var images = {}, imageDiv = {};
		imageDiv[layers[0]] = d3.select('.imageDiv.' + layers[0]);
		imageDiv[layers[1]] = d3.select('.imageDiv.' + layers[1]);
		console.log(data);

		data.forEach(function(d){ d.date = new Date(d.date); });

		data.sort(function(a,b){ return a.date.valueOf() - b.date.valueOf(); });

		data.forEach(function(d){
			// create new array for dots
			//var date = new Date(d.date);
			//console.log(d.date, date)
			if ( d.date > startDate && d.date < endDate ) {
				// find team by hashtags
				//console.log(d.hashtags,d.hashtags.replace(/'/g,'"').replace(/\\x../g,'?'));
				if (d.hashtags) {
					d.hashtags = JSON.parse(d.hashtags.replace(/'/g,'"').replace(/\\x../g,'?'));
					for (h in hashtags) {
						isTag[h] = false;
						d.hashtags.forEach(function(dh){
							if (hashtags[h].indexOf(dh) != -1)
								isTag[team = h] = true;
						})
					}
					hcount = 0;
					for (h in isTag) 
						if (isTag[h]) hcount++;
					if (hcount != 1) team = 'other';
				}
				if (d.text && team == 'other') {
					for (h in hashtags) {
						isTag[h] = false;
						hashtags[h].forEach(function(t){
							if (d.text.toLowerCase().indexOf(t) != -1)
								isTag[team = h] = true;
						})
					}
					hcount = 0;
					for (h in isTag) 
						if (isTag[h]) hcount++;
					if (hcount != 1) team = 'other';
					//team != 'other' && console.log(team,d.hashtags,d.text)
				}
				//!!! team may be undefined!!! Why?!?!
				if (team && team != 'other' && d.imageUrl) {
					stamp = Math.round(d.date.valueOf() / (1000 * 60 * imagePeriod));
					if (!prevStamp) {
						startStamp = prevStamp = stamp;
					}
					//console.log(stamp, prevStamp, +d.follower_count, follNum[team], team, follNum);
					if (stamp != prevStamp) {
						follNum[layers[0]] = 0;
						follNum[layers[1]] = 0;
						imageDiv[layers[0]].append('div').style({ display: 'none', background: 'url(' + images[prevStamp][layers[0]] + ') 50% 50% no-repeat'}).datum((prevStamp - startStamp));
						imageDiv[layers[1]].append('div').style({ display: 'none', background: 'url(' + images[prevStamp][layers[1]] + ') 50% 50% no-repeat'}).datum((prevStamp - startStamp));
						//imageDiv[layers[1]].append('div').attr({'src': images[prevStamp][layers[1]] }).style('display','none').datum((prevStamp - startStamp));
						if (!images[stamp]) images[stamp] = {};
						images[stamp][layers[0]] = images[prevStamp][layers[0]];
						images[stamp][layers[1]] = images[prevStamp][layers[1]];
						prevStamp = stamp;
					} 
					if (+d.follower_count > follNum[team]) {
						follNum[team] = +d.follower_count;
						if (!images[stamp]) images[stamp] = {};
						images[stamp][team] = d.imageUrl;
					}
				}
				//console.log(images)
				dots.push({
					 lat: +d.lat
					,lon: +d.lon
					,team: team
					,followers: +d.follower_count || 1
					,utime: d.story_date
					,time: d.date
					,sentiments: d.sentiments
					,name: d.name || d.screen_name || ''
					,text: d.text || ''
					,type: sourceNames[d.source || 'other']
					,imageUrl: d.imageUrl
				})				
			}
		})

		makeMap();
	})


	function makeMap() {
		console.log(dots)
		var playing = false
			,timezone = 0 
			,times = d3.extent(dots, function(d){ return d.time; }) // time bounds from data
			,startMinute = 60 * times[0].getUTCHours() + times[0].getUTCMinutes();

		// start dates floored to the nearest time rounded by selected period
		var periods = { minute: 60*1000, min5: 5*60*1000, quarter: 15*60*1000, hour: 60*60*1000, day: 24*60*60*1000 }
			,numOfPeriods = {}
			,startTimeByPeriod = {}
			,dotsByPeriod = {}
			,prevStamp;
			images = d3.selectAll('.imageDiv div')

			console.log(images)

		for (period in periods) {
			numOfPeriods[period] = Math.ceil((times[1]-times[0])/periods[period] );
			startTimeByPeriod[period] = new Date (times[0] - times[0] % periods[period]);
			dotsByPeriod[period] = {};
		}


		// events timeline and scores
		var  events = [
				 { time: "18:15", type: "gameTimes", score: '0:0', text: 'Start' }
				,{ time: "18:30", type: "kickoff" }
				,{ time: "19:03", type: "quarter", size: 'small', text: "2nd Quarter" }
				,{ time: "19:13", type: "touchdown", team: "patriots", score: "7:0" }
				,{ time: "19:36", type: "touchdown", team: "hawks", score: "7:7" }
				,{ time: "19:49", type: "touchdown", team: "patriots", score: "14:7" }
				,{ time: "19:59", type: "touchdown", team: "hawks", score: "14:14" }
				,{ time: "20:11", type: "halftimestart", size: 'small' }
				,{ time: "20:32", type: "halftimeend", size: 'small' }
				,{ time: "20:38", type: "fieldgoal", team: "hawks", score: "14:17" }
				,{ time: "20:54", type: "touchdown", team: "hawks", score: "14:24" }
				,{ time: "21:14", type: "quarter", size: 'small', text: "4nd Quarter" }
				,{ time: "21:28", type: "touchdown", team: "patriots", score: "21:24" }
				,{ time: "21:48", type: "touchdown", team: "patriots", score: "28:24" }
				,{ time: "22:01", type: "interception", team: "patriots", text: "@Mac_BZ INTERCEPTION" }
				,{ time: "22:04", type: "gameTimes", text: 'End' }
			]
			,eventsMap = {}
			,scores = [];

		events.forEach(function(e){ 
			e.ftime = new Date( startTimeByPeriod.day.valueOf() + (+e.time.split(':')[0]) * 60*60*1000 + (+e.time.split(':')[1]) * 60*1000 );
			//console.log(e.time, e.ftime)
			e.minute = Math.floor ((e.ftime - startTimeByPeriod.minute) / periods.minute); 
			e.score && scores.push(e);
			eventsMap[e.minute] = e;
		});

		// calch each dot rounded time 
		dots.forEach(function(dot){
			for (period in periods)
				dot[period] = Math.floor ((dot.time - startTimeByPeriod[period]) / periods[period]);
		})

		// define circles size scale function (by num of followers)
		//var domain = [0,d3.max(dots, function(d){ return +d.followers; })];
		// use custom max extent to make all the bubbles not smallest size if there is a profile with follower=10000000 
		var domain = [0,100000]
			,radius = d3.scale.sqrt()
				.range([2,10]) // circle min and max size in px
				.domain(domain)
				.clamp(1);

		// create leaflet map
		var map = L.map('map', {zoomControl: false}).setView([33.5275, -112.2625], 17);

		// create zoom with custom position
		new L.Control.Zoom({ position: 'topright' }).addTo(map);

		// map base layer
		L.tileLayer(
				'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
				 maxZoom: 20
				,minZoom: 14
				,opacity: 1
				,detectRetina:true
			}).addTo(map);

		// sort dots to show on top those that have team hashtag
		dots.sort(function(a,b){ return a.team == 'other' ? -1 : 1; });

		// add circles to the map
		dots.forEach(function(dot){
			//console.log(dot)
			dot.circle = L.circleMarker([ dot.lat, dot.lon ], {
				className: 'dot ' + dot.team,
				// style via css classes
				fillColor: null,
				fillOpacity: null,
				stroke: false,
				fill: true,
				weight: 0,
				radius: radius(dot.followers)
			}).addTo(map);

			// add popup
			var popup = d3.select('#popup.template').html();
			for (field in dot)
				popup = popup.replace('{{' + field + '}}',dot[field]);
			if (dot.imageUrl)
				popup += '<br><img src="' + dot.imageUrl + '">';
			dot.circle
				.bindPopup(popup, { autoPanPaddingTopLeft: L.Point(0,100) })
				.on('mouseover',function(){ this.openPopup(); })
				//.on('mouseout',function(){ this.closePopup(); });
			d3.select(dot.circle._path).datum(dot);

			// calc time series chart data for different time intercals (actually we will use only quarter for chart and minute for timeslider) 
			var dotsBy, dotBy;
			for (period in dotsByPeriod) {
				dotsBy = dotsByPeriod[period];
				periodNum = dot[period];
				if (!dotsBy[periodNum])
					dotsBy[periodNum] = { total: 0, sent: { total: 0 } };
				if (!dotsBy[periodNum][dot.team])
					dotsBy[periodNum][dot.team] = 0;
				dotsBy[periodNum].total++;
				dotsBy[periodNum][dot.team]++;
				if (!dotsBy[periodNum].sent[dot.team])
					dotsBy[periodNum].sent[dot.team] = 0;
				dotsBy[periodNum].sent.total += +dot.sentiments;
				dotsBy[periodNum].sent[dot.team] += +dot.sentiments;
			}
		})

		for (period in dotsByPeriod) 
			for (periodNum in dotsByPeriod[period]) 
				for (h in hashtags) {
					dotsByPeriod[period][periodNum].sent[h] /= dotsByPeriod[period][periodNum][h];
					console.log()
				}

		for (period in dotsByPeriod)
			for (var i = 0; i < numOfPeriods[period]; i++) {
				if (!dotsByPeriod[period][i])
					dotsByPeriod[period][i] = { total: 0 };
				if (!dotsByPeriod[period][i].sent)
					dotsByPeriod[period][i].sent = { total: 0 };
			}

		d3dots = d3.selectAll('.dot');

		// make time series
		var  width = d3.select('#charts').node().clientWidth
			,height1 = d3.select('.chart1').node().clientHeight
			,height2 = d3.select('.chart2').node().clientHeight
			,height3 = d3.select('.chart3').node().clientHeight
			//console.log(height2)
			// arrays for d3 charts
			,dotsByHourArr = d3.entries(dotsByPeriod.hour)
			,dotsByMinuteArr = d3.entries(dotsByPeriod.minute)
			,dotsByMin5 = d3.entries(dotsByPeriod.min5)
			,dotsByQuarterArr = d3.entries(dotsByPeriod.quarter)
			,chartData = { volume: {}, sentiments: {} };

		for (h in hashtags){
			chartData.volume[h] = dotsByMin5.map (function(d){
				return { x: +d.key, y: d.value[h] || 0 };
			})
			chartData.sentiments[h] = dotsByMin5.map (function(d){
				return { x: +d.key, y: d.value.sent[h] || 0 };
			})
		}
		
		console.log(chartData);
			// scales for stories number chart
			
		var  stack = d3.layout.stack().offset("silhouette")
			,stackedData = stack(d3.values(chartData.volume))
			,x = d3.scale.linear()
				.domain(d3.extent(chartData.volume[d3.keys(hashtags)[0]], function(d){ return +d.x; }))
				.range([0, width])
			,y1  = d3.scale.linear()
    			.domain([0, d3.max(stackedData, function(layer) { 
    				return d3.max(layer, function(d) { return d.y0 + d.y; }); 
    			})])
				.range([height1-2, 1])
			,line1 = d3.svg.line()
				.interpolate("cardinal")
				.x(function(d) { return x(+d.x); })
				.y(function(d) { return y1(+d.y || 0); })
			,area = d3.svg.area()
				.interpolate("cardinal")
			    .x(function(d) { return x(d.x); })
			    .y0(function(d) { return y1(d.y0); })
			    .y1(function(d) { return y1(d.y0 + d.y); })
			,chart1 = d3.select('#charts .chart1').append('svg')
				.attr({ width: width, height: height1 })
			// scales for sentiments chart
			,y2  = d3.scale.linear()
				.domain([ 
							d3.min(d3.keys(hashtags), function(h) { 
								return d3.min(chartData.sentiments[h], function(d) { return d.y; })
							}),
							d3.max(d3.keys(hashtags), function(h) { 
								return d3.max(chartData.sentiments[h], function(d) { return d.y; })
							})
						])
				.domain([-0.2,0.5])
				.range([height2-1, 1])
			,line2 = d3.svg.line()
				.interpolate("cardinal")
				.x(function(d) { return x(+d.x); })
				.y(function(d) { return y2(+d.y || 0); })
			,chart2 = d3.select('#charts .chart2').append('svg')
				.attr({ width: width, height: height2 })

			,timeline = d3.select('#charts .timeline').append('svg')
				.attr({ width: width, height: 50 })
				.append('g').attr('transform','translate(' + 0 + ',' + 10 + ')')

		//timeline.append('line').attr({ x1: 0, x2: width, y1: 0, y2: 0, class: 'timelineAxis' });

		//chart1.append('line').attr({ x1: 0, x2: width, y1: height1-1, y2: height1-1, class: 'chartAxis' });
		chart2.append('line').attr({ x1: 0, x2: width, y1: y2(0), y2: y2(0), class: 'chartAxis' });

		chart1.selectAll("path")
			.data(stack(d3.values(chartData.volume)))
			.enter().append('path')
			.attr('d', area)
			.attr({ class: function(d, i) {
				return 'line ' + d3.keys(hashtags)[i];
			} });

		d3.keys(hashtags).forEach(function(team){
			chart2.append('path')
				.datum(chartData.sentiments[team])
				.attr({ class: 'line ' + team })
				.attr('d', line2)
		})


		// make events timeline
		var xByMinute = x.copy().domain(d3.extent(dotsByMinuteArr, function(d){ return +d.key; }))
			,timelineEvents = timeline.selectAll('g')
				.data(events).enter()
				.append('g')
					.attr('class', function (d){ 
						d.g = d3.select(this); 
						return d.type + ' hidden ' + (d.team || 'other') + ' ' + (d.size || ''); 
					})
					.attr('transform', function (d){ 
						return 'translate(' + xByMinute(d.minute) + ',0)'; 
					});
/*
		timelineEvents.filter(function(d){ return d.type == 'gameTimes'; })
			.append('line').attr({ y2: height });
*/
		timelineEvents.append('circle').attr({ r: 6 })
			.on('mouseover', function(){ d3.select(this.parentNode).classed('hidden', 0); })
			.on('mouseout', function(){ d3.select(this.parentNode).classed('hidden', 1); });

		timelineEvents.append('text').attr({ dy: '1.8em' }).text(function(d){ return d.text || d.type; });
		timelineEvents.append('text').attr({ dy: '3em', class: 'time' }).text(function(d){ return d.time; });

		// slider init
		var sliderHandle = d3.select('#slider .handle')
			,sliderHandleTime = d3.select('.time')
			,sliderHandleScore = [ d3.select('.score.hawks'), d3.select('.score.patriots') ]
			,slider = new Dragdealer('slider', {
				 steps: numOfPeriods.minute
				,animationCallback: moveSLider
			})
			,playButton = d3.select('.playButton').on('click',playClick),
			isAll = false
			,curStep;

		// time format for slider handle
		function formatTime(minute){
			var hour = (Math.floor(minute / 60) + timezone + 24) % 24;
			minute = minute % 60;
			return (hour % 12 == 0 ? 12 : hour % 12) + ':' + (minute < 10 ? '0' : '') + minute + (hour > 11 ? 'pm' : 'am');
		}
		// callback when slider handle is dragging
		
		function moveSLider (xOffset){
			var step = Math.round(xOffset * numOfPeriods.minute);

			map.closePopup();

			sliderHandleTime.text( step == numOfPeriods.minute ? 'All' : formatTime( step + startMinute ) );

			// calc current scores
			var i = scores.length - 1;
			while ( i >0 && scores[i].minute > step) i--;

			var score = scores[i].score.split(':');

			sliderHandleScore[0].text( score[1] );
			sliderHandleScore[1].text( score[0] );

			// events show
			timelineEvents.classed('hidden',1);
			if (eventsMap[step]) {
				eventsMap[step].g.classed('hidden', 0);
				slow = 5;
				console.log(step, eventsMap[step])
			}

			// change dots style
			if (step == numOfPeriods.minute && !isAll) {
				sliderHandle.classed('all', 1);
				d3dots.classed('dotsAll', 1);
				isAll == true;
			} else {
				isAll == false;
				sliderHandle.classed('all', 0);
				d3dots.classed('dotsAll', 0);
				d3dots.filter(function(d){ return d.minute == step; }).classed('anima', 1);
				d3dots.classed('invisible', function(d){ return d.minute > step; });
			}

			//console.log(Math.round(step/15), prevStamp)
			if (Math.round(step/imagePeriod) != prevStamp) {
				prevStamp = Math.round(step/imagePeriod);
				images.style('display','none');
				images.filter(function(d){ return d == prevStamp; }).style('display',null);
			}
		}
		// start/stop play
		function playClick(){
			var isActive = ! playButton.classed('active');
			if (isActive){
				if (curStep == numOfPeriods.minute)
					slider.setStep(0)
				playing = true;
				play(1);
			}
			else 
				play(0);
			playButton.classed('active',isActive);
			playButton.text(isActive ? '❚❚ ' : '▶')
		}
		// play mode
		var slow = 0;
		function play(isPlay){
			if (!isPlay || !playing) {
				playing = false;
			} else {
				if (slow) slow--;
				curStep = slider.getStep()[0];
				if (curStep != numOfPeriods.minute) {
					slider.setStep(curStep + 1);
					setTimeout( function() { play(1); }, 100);
				} else 
					playClick();
			}
		}
		playClick();
	}
})()