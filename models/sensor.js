var schemas = require("./schemas.js")
var _ = require("lodash")
Room = require("./room.js")

var Sensor = function (data) {
    this.data = this.sanitize(data)
}

Sensor.prototype.data = {}

Sensor.prototype.get = function (attr) {
    return this.data[attr]
}

Sensor.prototype.set = function (attr, value) {
    this.data[attr] = value
}

Sensor.prototype.sanitize = function (data) {
    data = data || {}
    schema = schemas.sensor
    return _.pick(_.defaults(data, schema), _.keys(schema))
}

// Helper functions

Sensor.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO sensor(bluetooth_address, bluetooth_channel, type) VALUES($1, $2, $3) RETURNING *;'
  const values = [this.data.bluetooth_address, this.data.bluetooth_channel, this.data.type]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}


Sensor.prototype.rooms = function (callback) {

  const queryString = 'SELECT r.*, rs.direction FROM room r INNER JOIN room_sensor rs ON r.id = rs.room_id WHERE rs.sensor_id = $1;'
  const values = [this.data.id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows)
    }
  })
}



Sensor.findByBluetoothAddress = function (bluetooth_address, callback) {
  const queryString = 'SELECT s.* FROM sensor s WHERE s.bluetooth_address = $1;'
  const values = [bluetooth_address]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = Sensor