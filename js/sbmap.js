(function sbmap(){
	var  dots = []
		// hashtags for each team
		,hashtags = {
			hawks: ["seahawks","gohawks","seattle","12thman","goseahawks","weare12","seattleseahawks","12s","12","hawks","twelfie","tb12","beastmode"]
			,patriots: ["patriots","patriots","patsnation","doyourjob","pats","newengland","newenglandpatriots","patriotsnation","gopatriots","finishthejob","tombrady","brady"]
		}
		,layers = ['hawks','patriots','other']
		// time frame 
		,startDate = new Date('2015-02-01T17:00:00+00:00')
		,endDate = new Date('2015-02-02T01:15:00+00:00');

	// load data. It's better to change data format to csv to reduce loading time
	d3.json('data/super_bowl_output.json', function(error, data){
		var isTags, team;

		data.stories.forEach(function(d){
			if (d._source.precise_location) {
				// create new array for dots
				var date = new Date(d._source.story_date);
				if ( date > startDate && date < endDate ) {
					// find team by hashtags
					isTags = {}
					for (h in hashtags)
						isTags[h] = false;
					team = 'other';
					d._source.hashtags && d._source.hashtags.forEach(function(m){
						for (h in hashtags)
							if (hashtags[h].indexOf(m) != -1)
								isTags[h] = true;
					})
					for (h in hashtags)
						if (isTags[h])
							team = team == 'other' ? h : 'other';
					dots.push({
						 lat: +d._source.location.lat
						,lon: +d._source.location.lon
						,team: team
						,followers: +d._source.profile.follower_count
						,utime: d._source.story_date
						,time: date
						,name: d._source.profile.name || d._source.screen_name
						,text: d._source.text || ''
						,type: d._source.source || '' 
					})				
				}
			}
		})

		makeMap();
	})


	function makeMap() {
		var playing = false
			,timezone = 0 
			,times = d3.extent(dots, function(d){ return d.time; }) // time bounds from data
			,startMinute = 60 * times[0].getUTCHours() + times[0].getUTCMinutes();

		// start dates floored to the nearest time rounded by selected period
		var periods = { minute: 60*1000, quarter: 15*60*1000, hour: 60*60*1000, day: 24*60*60*1000 }
			,numOfPeriods = {}
			,startTimeByPeriod = {}
			,dotsByPeriod = {}

		for (period in periods) {
			numOfPeriods[period] = Math.ceil((times[1]-times[0])/periods[period] );
			startTimeByPeriod[period] = new Date (times[0] - times[0] % periods[period]);
			dotsByPeriod[period] = {};
		}
		// events timeline and scores
		var  events = [
				 { time: "18:15", type: "gameTimes", score: '0:0', text: 'Start' }
				,{ time: "18:30", type: "kickoff" }
				,{ time: "19:03", type: "quarter small", text: "2nd Quarter" }
				,{ time: "19:13", type: "touchdown", team: "patriots", score: "7:0" }
				,{ time: "19:36", type: "touchdown", team: "hawks", score: "7:7" }
				,{ time: "19:49", type: "touchdown", team: "patriots", score: "14:7" }
				,{ time: "19:59", type: "touchdown", team: "hawks", score: "14:14" }
				,{ time: "20:11", type: "halftimestart small" }
				,{ time: "20:32", type: "halftimeend small" }
				,{ time: "20:38", type: "fieldgoal", team: "hawks", score: "14:17" }
				,{ time: "20:54", type: "touchdown", team: "hawks", score: "14:24" }
				,{ time: "21:14", type: "quarter small", text: "4nd Quarter" }
				,{ time: "21:28", type: "touchdown", team: "patriots", score: "21:24" }
				,{ time: "21:48", type: "touchdown", team: "patriots", score: "28:24" }
				,{ time: "22:01", type: "interception", team: "patriots", text: "@Mac_BZ INTERCEPTION" }
				,{ time: "22:04", type: "gameTimes", text: 'End' }
			]
			,eventsMap = {}
			,scores = [];

		events.forEach(function(e){ 
			e.ftime = new Date( startTimeByPeriod.day.valueOf() + (+e.time.split(':')[0]) * 60*60*1000 + (+e.time.split(':')[1]) * 60*1000 );
			console.log(e.time, e.ftime)
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
			dot.circle
				.bindPopup(popup)
				.on('mouseover',function(){ this.openPopup(); })
				//.on('mouseout',function(){ this.closePopup(); });
			d3.select(dot.circle._path).datum(dot);

			// calc time series chart data for different time intercals (actually we will use only quarter for chart and minute for timeslider) 
			var dotsBy, dotBy;
			for (period in dotsByPeriod) {
				dotsBy = dotsByPeriod[period];
				periodNum = dot[period];
				if (!dotsBy[periodNum])
					dotsBy[periodNum] = { total: 0 };
				if (!dotsBy[periodNum][dot.team])
					dotsBy[periodNum][dot.team] = 0;
				dotsBy[periodNum].total++;
				dotsBy[periodNum][dot.team]++;
			}
		})

		for (period in dotsByPeriod)
			for (var i = 0; i < numOfPeriods[period]; i++)
				if (!dotsByPeriod[period][i])
					dotsByPeriod[period][i] = { total: 0 };

		d3dots = d3.selectAll('.dot');

		// make time series
		var  width = d3.select('#slider').node().clientWidth
			,height = d3.select('#slider').node().clientHeight
			,topMargin = 36
			// arrays for d3 charts
			,dotsByHourArr = d3.entries(dotsByPeriod.hour)
			,dotsByMinuteArr = d3.entries(dotsByPeriod.minute)
			,dotsByQuarterArr = d3.entries(dotsByPeriod.quarter)
			// scales for d3 charts
			,x = d3.scale.linear()
				.domain(d3.extent(dotsByQuarterArr, function(d){ return +d.key; }))
				.range([40, width-40])
			,y  = d3.scale.linear()
				.domain([0, d3.max(dotsByQuarterArr, function(d){ 
					return d3.max(d3.keys(hashtags), function(h) { return d.value[h] || 00;  })
				})])
				.range([height - topMargin, 3])
			,line = {}
			,chart = d3.select('div.timeline').append('svg')
				.attr({ width: width, height: height })
					.append('g').attr('transform','translate(' + 0 + ',' + topMargin + ')')
			,timeline = chart.append('g').attr('id', 'timeline');

		chart = chart.append('g');

		d3.keys(hashtags).forEach(function(team){
			line[team] = d3.svg.line()
				.interpolate("cardinal")
				.x(function(d) { return x(+d.key); })
				.y(function(d) { return y(+d.value[team] || 0); }); 
			chart.append('path')
				.datum(dotsByQuarterArr)
				.attr({ class: 'line ' + team })
				.attr('d', line[team])
				//.style('stroke', color(team));
		})

		// make events timeline
		var xByMinute = x.copy().domain(d3.extent(dotsByMinuteArr, function(d){ return +d.key; }))
			,timelineEvents = timeline.selectAll('g')
				.data(events).enter()
				.append('g')
					.attr('class', function (d){ 
						d.g = d3.select(this); 
						return d.type + ' hidden ' + (d.team || ''); 
					})
					.attr('transform', function (d){ 
						return 'translate(' + xByMinute(d.minute) + ',0)'; 
					});

		timelineEvents.filter(function(d){ return d.type == 'gameTimes'; })
			.append('line').attr({ y2: height });

		timelineEvents.append('circle').attr({ r: 4 })
			.on('mouseover', function(){ d3.select(this.parentNode).classed('hidden', 0); })
			.on('mouseout', function(){ d3.select(this.parentNode).classed('hidden', 1); });

		timelineEvents.append('text').attr({ dy: '-1.8em' }).text(function(d){ return d.text || d.type; });
		timelineEvents.append('text').attr({ dy: '-0.6em', class: 'time' }).text(function(d){ return d.time; });

		// make legend bar chart
		var  width = d3.select('#legend').node().clientWidth
			,height = d3.select('#legend').node().clientHeight
			,xBars = d3.scale.linear()
				.domain([0, d3.max(dotsByQuarterArr, function(d){ 
					return d3.max(d3.keys(hashtags), function(h) { return d.value[h] || 0; })
				})])
				.range([1, width - 64])
			,barChart=d3.select('#legend').append('svg').append('g')
				.attr('transform','translate(' + 50 + ',' + 13 + ')');

		bars = barChart.selectAll('g').data(layers).enter().append('g')
			.attr('class',function(d){return 'bar ' + d; })
			.attr('transform', function(d,i) { return 'translate(' + 20 + ',' + (i * 18) + ')'; })
		
		bars.append('text').attr({ class: 'team', dx: -5, dy: 7 })
			.text(function(d){ return '#' + d; });

		bars.append('rect').attr({  x: 0, y: 0, height: 6 });

		// slider init
		var sliderHandle = d3.select('#slider .handle')
			,sliderHandleTime = sliderHandle.select('.time')
			,sliderHandleScore = [ sliderHandle.select('.score .hawks'), sliderHandle.select('.score .patriots') ]
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
		function moveSLider(xOffset){
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

			// update bar chart
			bars.selectAll('rect').transition().duration(250)
				.attr('width', function(d) { return xBars( dotsByPeriod.quarter[Math.floor(step/15)][d] || 0); } )
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
		function play(isPlay){
			if (!isPlay || !playing) {
				playing = false;
			} else {
				curStep = slider.getStep()[0];
				if (curStep != numOfPeriods.minute) {
					slider.setStep(curStep + 1);
					setTimeout( function() { play(1); }, 50);
				} else 
					playClick();
			}
		}
	}
})()