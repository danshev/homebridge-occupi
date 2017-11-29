// http://timjrobinson.com/how-to-structure-your-nodejs-models-2/
// https://node-postgres.com/features/queries

Sensor = require("./models/sensor.js")
Room = require("./models/room.js")
RoomSensor = require("./models/roomSensor.js")
const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'pi',
  host: 'localhost',
  database: 'occupancykit_dev',
  password: 'Secure,06',
  port: 3211,
})


function processBluetoothEvent (data) {
  var sensor = Sensor.findByBluetoothIdentifier(data.identifier)
  
}