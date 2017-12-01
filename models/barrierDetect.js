var schemas = require("./schemas.js")
var _ = require("lodash")

var BarrierDetect = function (data) {
    this.data = this.sanitize(data)
}

BarrierDetect.prototype.data = {}

BarrierDetect.prototype.get = function (attr) {
    return this.data[attr]
}

BarrierDetect.prototype.set = function (attr, value) {
    this.data[attr] = value
}

BarrierDetect.prototype.sanitize = function (data) {
    data = data || {}
    schema = schemas.barrierDetect
    return _.pick(_.defaults(data, schema), _.keys(schema))
}

// Helper functions

BarrierDetect.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO barrier_detect(sensor_id) VALUES($1) RETURNING *;'
  const values = [this.data.sensor_id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

BarrierDetect.log = function (inRoom_id, outRoom_id, callback) {
  const queryString = "INSERT INTO barrier_detect(room_id, direction) VALUES ($1, 'in'), ($2, 'out') RETURNING *;"
  const values = [inRoom_id, outRoom_id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = BarrierDetect