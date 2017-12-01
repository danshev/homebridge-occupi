var schemas = require("./schemas.js")
var _ = require("lodash")

var RoomSensor = function (data) {
    this.data = this.sanitize(data)
}

RoomSensor.prototype.data = {}

RoomSensor.prototype.get = function (attr) {
    return this.data[attr]
}

RoomSensor.prototype.set = function (attr, value) {
    this.data[attr] = value
}

RoomSensor.prototype.sanitize = function (data) {
    data = data || {}
    schema = schemas.roomSensor
    return _.pick(_.defaults(data, schema), _.keys(schema))
}

// Helper functions

RoomSensor.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO room_sensor(room_id, sensor_id, direction) VALUES($1, $2, $3) RETURNING *;'
  const values = [this.data.room_id, this.data.sensor_id, this.data.direction]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = RoomSensor