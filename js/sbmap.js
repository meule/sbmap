(function sbmap(){
	// just for debug
	var timeCorrection = window.location.hash.substr(1) || 0;

		// config from sbconfig.js
		// time format for slider handle
	var  hashtags = sbconfig.hashtags
		,startDate = moment(sbconfig.startDate)
		,endDate = moment(sbconfig.endDate)
		,timezone = sbconfig.timezone
		,sliderPeriod = sbconfig.sliderPeriod
		,chartsPeriod = sbconfig.chartsPeriod
		,events = sbconfig.events
		,sourceNames = { 'i': 'Instagram', 't': 'Twitter', 'o': 'Other'} // sources were trimmed in data_process.py to optimize data size
		,layers = ['team1', 'team2', 'team3'] // for css, team3 means not any team
		,title = '#' + sbconfig.eventName + ' <span class="team1">' + sbconfig.teamNames[0] + '</span> vs <span class="team2">' + sbconfig.teamNames[1] + ' </span>@' + sbconfig.stadiumName
		,colors = sbconfig.teamColors
		,scheet = window.document.styleSheets[window.document.styleSheets.length-1]
		,formatTime = function(date){ return moment(date).utc().add(timezone,'hours').format("h:mma");}
	// add title
	d3.select('.title').html(title);
	// add team colors to css
	colors.forEach(function(c, i){
		scheet.insertRule('.team' + (i+1) + ', .team' + (i+1) + ' *  {stroke:' + c + ';fill:' + c + '; color:' + c + ';}', 0);
	})
	// data loading
	d3.csv('data/data.csv', function(error, data){
		var team, teams, dots = [];
		data.forEach(function(d){ d.date = moment(d.date).add(timeCorrection, 'hours'); });
		data.sort(function(a,b){ return a.date.valueOf() - b.date.valueOf(); });
		data.forEach(function(d){
			// create new array for dots
			if ( d.date > startDate && d.date < endDate ) {
				// find team by hashtags
				team = 2; // 2 means not any team
				teams = [];
				if (d.hashtags) {
					d.hashtags = JSON.parse(d.hashtags.replace(/'/g,'"').replace(/\\x../g,'?'));
					hashtags.forEach(function(hs,i){
						hs.forEach(function(tag){
							if (d.hashtags.indexOf(tag) != -1)
								teams[team = i] = true;
						})
					})
					if (teams[0] && teams[1]) team = 2; // no team if both team hashtags were found
				}
				// otherwise find team name in text in the same way
				if (d.text && team == 2) {
					hashtags.forEach(function(hs,i){
						hs.forEach(function(tag){
							if (d.text.toLowerCase().indexOf(tag) != -1)
								teams[team = i] = true;
						})
					})
					if (teams[0] && teams[1]) team = 2;
				}
				dots.push({
					 lat: +d.lat
					,lon: +d.lon
					,team: team
					,followers: +d.follower_count || 1
					,textDate: formatTime(d.date)
					,time: d.date
					,sliderPeriod: Math.floor ((d.date - startDate) / sliderPeriod) // period index for each dot
					,chartsPeriod: Math.floor ((d.date - startDate) / chartsPeriod)
					,sentiments: +d.sentiments
					,name: d.name || d.screen_name || ''
					,text: d.text || ''
					,type: sourceNames[d._source || 'o']
					,imageUrl: d.imageUrl
				})				
			}
		})
		// sort dots to show on top those that have team hashtag
		dots.sort(function(a,b){ return a.team == 2 ? -1 : 1; });
		makeMap(dots);
	})

	function makeMap(dots) {
		console.log(dots)
		var  playing = false
			,numOfPeriods = Math.ceil((endDate - startDate) / sliderPeriod )
			,dotsByPeriod = {}
			,eventsMap = {}
			,scores = []
			,dots4chart = { vol: { 0: {}, 1: {} }, sent: { 0: {}, 1: {} }, total: {} }
			,i
			// scale for dot radius. use custom max extent to make all the bubbles not smallest size if there is a profile with follower=10000000 or so
			,domain = [1,Math.max(100000, d3.max(dots, function(d){ return d.followers; }))]
			,radius = d3.scale.sqrt()
				.range([2,10]) // circle min and max size in px
				.domain(domain)
				.clamp(1);
		// create leaflet map
		var map = L.map('map', {zoomControl: false}).setView([33.5270, -112.2629], 17);
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
		// add circles with popups to the map
		var popupTemplate = d3.select('#popup.template').html();	
		dots.forEach(function(dot){
			// add circle
			dot.circle = L.circleMarker([ dot.lat, dot.lon ], {
				className: 'dot team' + (dot.team + 1),
				// put nulls here to style via css classes
				fillColor: null,
				fillOpacity: null,
				stroke: false,
				fill: true,
				weight: 0,
				radius: radius(dot.followers)
			}).addTo(map);
			// add popup
			popup = popupTemplate;
			for (field in dot) {
				popup = popup.replace('{{' + field + '}}',dot[field]);
			}
			if (dot.imageUrl) 
				popup += '<br><br><img src="' + dot.imageUrl + '">';
			dot.circle
				.bindPopup(popup)
				.on('mouseover',function(){ 
					this.openPopup(); 
					popup = this.getPopup();
					console.log(qwe=this)
					d3.select('.leaflet-popup img').on('load',function(){
						popup.update();
					})
				});
			// put datum for svg path for d3 manipulations
			d3.select(dot.circle._path).datum(dot);
			// aggregate data for charts
			i = dot.chartsPeriod;
			if (!dots4chart.vol[0][i]) {
				[0,1].forEach(function(t){
					dots4chart.vol[t][i] = { x: i, y: 0 };
					dots4chart.sent[t][i] = { x: i, y: 0, num: 0 };
				})				
			}
			if (dot.team != 2) {
				dots4chart.sent[dot.team][i].y += dot.sentiments;
				dots4chart.sent[dot.team][i].num++;
				dots4chart.vol[dot.team][i].y++;
			}
		});
		var  d3dots = d3.selectAll('.dot')
		// calc mean sentiment polarity for each chart period
		for (i in dots4chart.sent[0]) {
			[0,1].forEach(function(t){
				dots4chart.sent[t][i].y /= dots4chart.sent[t][i].num;
				//console.log(i, dots4chart.sent[t][i].y, dots4chart.sent[t][i].num)
			})	
		}
		['vol','sent'].forEach(function(key){
			[0,1].forEach(function(t){
				dots4chart[key][t] = d3.values(dots4chart[key][t]);
			})				
		})
		dots4chart.vol = d3.values(dots4chart.vol);
		console.log(dots4chart);

		// make time series
		// sizes from html
		var  width = d3.select('#charts').node().clientWidth
			,height1 = d3.select('.chart1').node().clientHeight
			,height2 = d3.select('.chart2').node().clientHeight
			// steam chart layout
			,stack = d3.layout.stack().offset("silhouette")
			,stackedData = stack(dots4chart.vol)
			,x = d3.scale.linear()
				.domain(d3.extent(dots4chart.vol['0'], function(d){ return d.x; }))
				.range([0, width])
			,y1  = d3.scale.linear()
    			.domain([0, d3.max(dots4chart.vol, function(layer) { 
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
			// sentiments chart
			,y2  = d3.scale.linear()
				.domain([ 
							d3.min([0,1], function(h) { 
								return d3.min(dots4chart.sent[h], function(d) { return d.y; })
							}),
							d3.max([0,1], function(h) { 
								return d3.max(dots4chart.sent[h], function(d) { return d.y; })
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
		chart2.append('line').attr({ x1: 0, x2: width, y1: y2(0), y2: y2(0), class: 'chartAxis' });
		chart1.selectAll("path")
			.data(stackedData)
			.enter().append('path')
			.attr('d', area)
			.attr({ class: function(d, i) {
				return 'line team' + (i + 1);
			} });
		[0,1].forEach(function(team){
			chart2.append('path')
				.datum(dots4chart.sent[team])
				.attr({ class: 'line team' + (team + 1) })
				.attr('d', line2)
		})
		// make game events timeline
		// process events data
		events.forEach(function(e){ 
			e.time = moment( e.time );
			e.team = typeof e.team == 'number' ? e.team : 2;
			e.sliderPeriod = Math.floor ((e.time - startDate) / sliderPeriod); 
			e.score && scores.push(e);
			eventsMap[e.sliderPeriod] = e;
		});
		var  timeline = d3.select('#charts .timeline').append('svg')
				.attr({ width: width, height: 50 })
				.append('g').attr('transform','translate(' + 0 + ',' + 10 + ')')
		 	,sliderX = x.copy().domain([0, numOfPeriods])
			,timelineEvents = timeline.selectAll('g')
				.data(events).enter()
				.append('g')
					.attr('class', function (d){ 
						d.g = d3.select(this); 
						return d.type + ' hidden team' + (d.team + 1) + ' ' + (d.size || ''); 
					})
					.attr('transform', function (d){ 
						return 'translate(' + sliderX(d.sliderPeriod) + ',0)'; 
					});
		timelineEvents.append('circle').attr({ r: 6 })
			.on('mouseover', function(){ d3.select(this.parentNode).classed('hidden', 0); })
			.on('mouseout', function(){ d3.select(this.parentNode).classed('hidden', 1); });
		timelineEvents.append('text').attr({ dy: '1.8em' }).text(function(d){ return d.text || d.type; });
		timelineEvents.append('text').attr({ dy: '3em', class: 'time' }).text(function(d){ return formatTime(d.time); });

		// slider init
		var  sliderHandle = d3.select('#slider .handle')
			,sliderHandleTime = d3.select('.time')
			,sliderHandleScore = [ d3.select('.score.team1'), d3.select('.score.team2') ]
			,slider = new Dragdealer('slider', {
				 steps: numOfPeriods
				,animationCallback: moveSLider
			})
			,playButton = d3.select('.playButton').on('click',playClick),
			isAll = false
			,curStep;

		// timeline is wider than chart (because of slider width), so use multiplicator
		// callback when slider handle is dragging
		function moveSLider (xOffset){
			map.closePopup();

			var step = Math.round(xOffset * numOfPeriods);
			sliderHandleTime.text( step == numOfPeriods ? 'All' : formatTime( startDate.valueOf() + step * sliderPeriod ) );
			// calc current scores
			var i = scores.length - 1;
			while ( i >0 && scores[i].sliderPeriod > step) i--;
			var score = scores[i].score.split(':');
			sliderHandleScore[0].text( score[1] );
			sliderHandleScore[1].text( score[0] );

			// events show
			timelineEvents.classed('hidden',1);
			if (eventsMap[step]) 
				eventsMap[step].g.classed('hidden', 0);
			// change dots style
			if (step == numOfPeriods && !isAll) {
				sliderHandle.classed('all', 1);
				d3dots.classed('dotsAll', 1);
				isAll == true;
			} else {
				isAll == false;
				sliderHandle.classed('all', 0);
				d3dots.classed('dotsAll', 0);
				d3dots.filter(function(d){ return d.sliderPeriod == step; }).classed('anima', 1);
				d3dots.classed('invisible', function(d){ return d.sliderPeriod > step; });
			}
		}
		// start/stop play
		function playClick(){
			var isActive = ! playButton.classed('active');
			if (isActive){
				if (curStep == numOfPeriods)
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
				if (curStep != numOfPeriods) {
					slider.setStep(curStep + 1);
					setTimeout( function() { play(1); }, 100);
				} else 
					playClick();
			}
		}
		playClick();
	}
})()