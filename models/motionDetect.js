var schemas = require("./schemas.js")
var _ = require("lodash")

var MotionDetect = function (data) {
    this.data = this.sanitize(data)
}

MotionDetect.prototype.data = {}

MotionDetect.prototype.get = function (attr) {
    return this.data[attr]
}

MotionDetect.prototype.set = function (attr, value) {
    this.data[attr] = value
}

MotionDetect.prototype.sanitize = function (data) {
    data = data || {}
    schema = schemas.motionDetect
    return _.pick(_.defaults(data, schema), _.keys(schema))
}

// Helper functions

MotionDetect.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO motion_detect(sensor_id) VALUES($1) RETURNING *;'
  const values = [this.data.sensor_id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

MotionDetect.queryByRoom = function (room_id, callback) {
  const queryString = 'SELECT md.* FROM motion_detect md INNER JOIN room_sensor rs ON rs.sensor_id = md.sensor_id WHERE rs.room_id = $1;'
  const values = [room_id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = MotionDetect