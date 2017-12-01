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


bluetoothData = { address: 'a-b-c', data: 'in' }

// Use the received bluetooth address to query details about the sensor
Sensor.findByBluetoothAddress(bluetoothData.address, (success, sensorData) => {
	if(!success) {
		console.log('error:' + sensorData)
		return
	} else if (sensorData === undefined) {
		console.log('no matching sensor')
		return
	}

	sensor = new Sensor(sensorData)
	sensor.rooms((success, roomData) => {
		if(!success) {
			console.log('error:' + sensorData)
			return
		} else if (sensorData === undefined) {
			console.log('no rooms associated with sensor')
			return
		}

		// Case: Motion Sensor
		if(sensor.get('type') === 'motion') {

			// set room's occupancy ==> true
			room = new Room(roomData[0])
			room.set('is_occupied', true)
			
			room.update((success, updatedRoomData) => {
				if(!success) {
					console.log('error:' + updatedRoomData)
					return
				} else if (updatedRoomData === undefined) {
					console.log("something went wrong updating the room's occupancy state")
					return
				}

				// log the detect
				detect = new MotionDetect({ sensor_id: sensor.get('id')})
				detect.save((success, motionDetectData) => {
					if(!success) {
						console.log('error:' + motionDetectData)
						return
					} else if (motionDetectData === undefined) {
						console.log("something went wrong while logging the motionDetect")
						return
					}
				})
			})
		} 

		// Case: Barrier Sensor
		else {
			if (roomData.length == 2) {
				for (roomD of roomData) {

					// set 'in' room's occupancy ==> true
					if(roomD.direction == 'in') {
						inRoom = new Room(roomD)
						inRoom.set('is_occupied', true)
						
						inRoom.update((success, updatedRoomData) => {
							if(!success) {
								console.log('error:' + updatedRoomData)
								return
							} else if (updatedRoomData === undefined) {
								console.log("something went wrong updating the room's occupancy state")
								return
							}

							console.log('set occupancy of room w/ id '+ inRoom.get('id') +' => true')
						})
					} else {
						outRoom = new Room(roomD)
						// query for motion in "out" room for the APPROPRIATE_LENGTH_OF_TIME
						console.log('initiating motion checking for room w/ id '+ outRoom.get('id'))
					}
				}
			} else {
				console.log('erroneous number of rooms associated with barrier sernsor')
				return
			}
		}
	})
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




