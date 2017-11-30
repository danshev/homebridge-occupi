// http://timjrobinson.com/how-to-structure-your-nodejs-models-2/
// https://node-postgres.com/features/queries

const { Pool, Client } = require('pg')
module.pool = new Pool({
  user: 'pi',
  host: 'localhost',
  database: 'occupi_dev',
  password: 'Secure,06',
  port: 5432,
})

Room = require("./models/room.js")
Sensor = require("./models/sensor.js")
RoomSensor = require("./models/roomSensor.js")
MotionDetect = require("./models/motionDetect.js")




/*
var myRoomSensor = new RoomSensor({room_id: 2, sensor_id: 1})
console.log(myRoomSensor)
myRoomSensor.save(function(success, data){
	console.log(success)
	console.log(data)
})
*/


// Use the received bluetooth address to query details about the sensor
Sensor.findByBluetoothAddress('a-b-c', (success, data) => {
	if(!success) {
		console.log('error:' + data)
		return
	} else if (data === undefined) {
		console.log('no matching sensor')
		return
	}

	sensor = new Sensor(data)
	if(sensor.get('type') === 'motion') {

		// set room's occupancy ==> true
		room = new Room({ id: data.room_id, is_occupied: true })
		room.update(function(success, data){
			console.log(success)
			console.log(data)

			// log the detect
			detect = new MotionDetect({ sensor_id: sensor.get('id')})
			detect.save(function(success, data){
				console.log(success)
				console.log(data)
			})
		})

	} 

	// barrier sensor
	else {
		room = new Room({
							id: data.room_id,
						    name: data.name,
						    is_bedroom: data.is_bedroom,
						    has_sunlight: data.has_sunlight,
						    homekit_id: data.homekit_id,
						    is_occupied: data.is_occupied
						})
	}

})


/*


MotionDetect.queryByRoom('123', (success, data) => {
			if(!success) {
				console.log('error:' + data)
				return
			} else if (data === undefined) {
				console.log('no motion detects')
				return
			}

			console.log(data)
		})










// ==> motion (will know the sensor bluetooth-address)
var buffer = {"address": 'a-b-c'}

function handleMotionDetect(buffer) {

}


// ==> barrier detect (will know the sensor bluetooth-address, direction)
var buffer = {"address": 'a-b-c', "direction": "in"}

function handleBarrierDetect(buffer) {

}
*/




