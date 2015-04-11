// config file for SuperBowl Project
var sbconfig = {
	 eventName: 'sb49'
	,stadiumName: 'UOPStadium'
	,teamNames: ['Patriots','Seahawks']
	,hashtags: [
		 ["patriots","patriots","patsnation","doyourjob","pats","newengland","newenglandpatriots","patriotsnation","gopatriots","finishthejob","tombrady","brady"]
		,["seahawks","gohawks","seattle","12thman","goseahawks","weare12","seattleseahawks","12s","12","hawks","twelfie","tb12","beastmode"]
	]
	,teamColors: ['#C60C30', '#69BE28']
	// time frame 
	,startDate: '2015-02-01T17:30:00-07:00'
	,endDate: '2015-02-02T00:00:00-07:00'
	,timezone: -7
	// if timezone is wrong in data.json file
	,timeCorrection: 7
	// time period for time slider step, ms
	,sliderPeriod: 60 * 1000
	// time period for charts plotting
	,chartsPeriod: 5 * 60 * 1000
	// game events
	,events: [
		 { time: "2015-02-01T18:15:00-07:00", type: "gameTimes", score: '0:0', text: 'Start' }
		,{ time: "2015-02-01T18:30:00-07:00", type: "kickoff" }
		,{ time: "2015-02-01T19:03:00-07:00", type: "quarter", size: 'small', text: "2nd Quarter" }
		,{ time: "2015-02-01T19:13:00-07:00", type: "touchdown", team: 0, score: "7:0" }
		,{ time: "2015-02-01T19:36:00-07:00", type: "touchdown", team: 1, score: "7:7" }
		,{ time: "2015-02-01T19:49:00-07:00", type: "touchdown", team: 0, score: "14:7" }
		,{ time: "2015-02-01T19:59:00-07:00", type: "touchdown", team: 1, score: "14:14" }
		,{ time: "2015-02-01T20:11:00-07:00", type: "halftimestart", size: 'small' }
		,{ time: "2015-02-01T20:32:00-07:00", type: "halftimeend", size: 'small' }
		,{ time: "2015-02-01T20:38:00-07:00", type: "fieldgoal", team: 1, score: "14:17" }
		,{ time: "2015-02-01T20:54:00-07:00", type: "touchdown", team: 1, score: "14:24" }
		,{ time: "2015-02-01T21:14:00-07:00", type: "quarter", size: 'small', text: "4nd Quarter" }
		,{ time: "2015-02-01T21:28:00-07:00", type: "touchdown", team: 0, score: "21:24" }
		,{ time: "2015-02-01T21:48:00-07:00", type: "touchdown", team: 0, score: "28:24" }
		,{ time: "2015-02-01T22:01:00-07:00", type: "interception", team: 0, text: "@Mac_BZ INTERCEPTION" }
		,{ time: "2015-02-01T22:04:00-07:00", type: "gameTimes", text: 'End' }
	]
}		