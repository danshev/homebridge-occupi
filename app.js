// http://timjrobinson.com/how-to-structure-your-nodejs-models-2/
// https://node-postgres.com/features/queries

// TODO: define TIME_WINDOW_IN_HOURS in room.js getOccupancyData() query
// TODO: enable main handler to correct initiate setInterval() checker (for CORRECT_LENGTH of time)
// TODO: create periodic occupancy updater

const { Pool, Client } = require('pg')
module.pool = new Pool({
  user: 'pi',
  host: 'localhost',
  database: 'occupi_dev',
  password: 'Secure,06',
  port: 5432
})

Room = require("./models/room.js")
Sensor = require("./models/sensor.js")
RoomSensor = require("./models/roomSensor.js")
MotionDetect = require("./models/motionDetect.js")
BarrierDetect = require("./models/barrierDetect.js")



// Every 5 minutes (or whatever WAS going to be the "after out motion" periodicity)

periodicOccupancyChecker = setInterval(function periodicOccupancyCheck() { 
	
	// Get all rooms
	Room.getAll((success, roomsData) => {
		if(!success) {
			console.log('Room.getAll ... ' + roomsData)
			return
		} else if (roomsData === undefined) {
			console.log("something went wrong getting all rooms data")
			return
		}

		for (roomData of roomsData) {

			room = new Room(roomData)
			timeWindow = room.get('is_bedroom') ? '360 min' : '120 min'

			room.getOccupancyData(timeWindow, (success, occupancyData) => {
				if(!success) {
					console.log('room.getOccupancyData ... ' + occupancyData)
					return
				} else if (occupancyData === undefined) {
					console.log("something went wrong getting the outRoom occupancy data")
					return
				}

				if ((occupancyData.barrier_total <= 0 && occupancyData.motion_total == 0) && occupancyData.is_occupied) {
					
					// set 'in' room's occupancy ==> false
					thisRoom = new Room({ id: occupancyData.room_id })
					thisRoom.set('is_occupied', false)
					thisRoom.update((success, updatedRoomData) => {
						if(!success) {
							console.log('room.update ... ' + updatedRoomData)
							return
						} else if (updatedRoomData === undefined) {
							console.log("something went wrong updating the room's occupancy state")
							return
						}

						console.log('updated occupancy => false of room id: '+ occupancyData.room_id)
					})
				}
			})
		}
	})
}, 3000)


setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))
setTimeout(this.handleBluetoothEvent({ "address": , "data": }, ))



function handleBluetoothEvent(bluetoothData, descriptionForLog) {

	Sensor.findByBluetoothAddress(bluetoothData.address, (success, sensorData) => {
		if(!success) {
			console.log('Sensor.findByBluetoothAddress ... ' + sensorData)
			return
		} else if (sensorData === undefined) {
			console.log('no matching sensor')
			return
		}

		sensor = new Sensor(sensorData)
		sensor.rooms((success, roomData) => {
			if(!success) {
				console.log('sensor.rooms ... ' + sensorData)
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
						console.log('room.update ... ' + updatedRoomData)
						return
					} else if (updatedRoomData === undefined) {
						console.log("something went wrong updating the room's occupancy state")
						return
					}

					// log the detect
					detect = new MotionDetect({ sensor_id: sensor.get('id')})
					detect.save((success, motionDetectData) => {
						if(!success) {
							console.log('detect.save ... ' + motionDetectData)
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

				// Validate the correct setup exists (1 barrier sensor joins 2 rooms)
				if (roomData.length == 2) {

					// The sensor.rooms() query always returns data rows ordered by direction, so 'in' then 'out'
					inRoom = bluetoothData.data == 'in' ? new Room(roomData[0]) : new Room(roomData[1])
					outRoom = bluetoothData.data == 'in' ? new Room(roomData[1]) : new Room(roomData[0])

					// Log the event (in's and out's)
					BarrierDetect.log(inRoom.get('id'), outRoom.get('id'), (success, barrierDetectData) => {
						if(!success) {
							console.log('BarrierDetect.log ... ' + barrierDetectData)
							return
						} else if (barrierDetectData === undefined) {
							console.log("something went wrong saving the barrier detects")
							return
						}

						timeWindow = outRoom.get('is_bedroom') ? '360 min' : '120 min'

						// Get the calculated number of occupants in the 'out' room
						outRoom.getOccupancyData(timeWindow, (success, occupancyData) => {
							if(!success) {
								console.log('outRoom.getOccupancyData ... ' + occupancyData)
								return
							} else if (occupancyData === undefined) {
								console.log("something went wrong getting the outRoom occupancy data")
								return
							}

							// COULD ADD NUMBER OF MOTION SENSORS TO getOccupancyData()

							// IF the room doesn't have motion sensors, then the occupancyData.barrier_total value is the go-by
							outRoom.getNumberMotionSensors((success, motionSensorCount) => {
								if(!success) {
									console.log('outRoom.getNumberMotionSensors ... ' + motionSensorCount)
									return
								} else if (motionSensorCount === undefined) {
									console.log("something went wrong getting the count of motion sensors")
									return
								}

								if (motionSensorCount == 0) {
									if (occupancyData.barrier_total <= 0) {
										
										//	Set 'out' room's occupancy ==> false
										outRoom.set('is_occupied', false)
										outRoom.update((success, updatedRoomData) => {
											if(!success) {
												console.log('outRoom.update ... ' + updatedRoomData)
												return
											} else if (updatedRoomData === undefined) {
												console.log("something went wrong updating the room's occupancy state")
												return
											}

											console.log('updated occupancy => false of room id: '+ outRoom.get('id'))
										})
									} else {
										// Room remains occupied by some (calculated) number of persons
										console.log('room w/ id '+ outRoom.get('id') +' remains occupied by '+ occupancyData.barrier_total + ' person')
									}
								} else {
									// If there are motion sensors, then the outRoom's occupancy will be analyzed by the periodic adjust routine
								}
							})
						})
						
						// set 'in' room's occupancy ==> true
						inRoom.set('is_occupied', true)
						inRoom.update((success, updatedRoomData) => {
							if(!success) {
								console.log('inRoom.update ... ' + updatedRoomData)
								return
							} else if (updatedRoomData === undefined) {
								console.log("something went wrong updating the room's occupancy state")
								return
							}

							console.log('updated occupancy => true of room id: '+ inRoom.get('id'))
						})
					})
				} else {
					console.log('erroneous number of rooms associated w/ barrier sernsor id= '+ sensor.get('id'))
					return
				}	
			}
		})
	})
}


















/*
	var myRoomSensor = new RoomSensor({room_id: 2, sensor_id: 1})
	console.log(myRoomSensor)
	myRoomSensor.save(function(success, data){
		console.log(success)
		console.log(data)
	})
*/

/*
	MotionDetect.queryByRoom('123', (success, data) => {
		if(!success) {
			console.log('MotionDetect.queryByRoom ... ' + data)
			return
		} else if (data === undefined) {
			console.log('no motion detects')
			return
		}

		console.log(data)
	})
*/
