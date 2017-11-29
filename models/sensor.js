var schemas = require("./schemas.js")
var _ = require("lodash")

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

Sensor.findByBluetoothIdentifier = function (id, callback) {
  const queryString = 'SELECT * FROM sensor WHERE bluetooth_identifier = $1;'
  const values = [id]

  pool.query(queryString, values, (err, res) => {
    pool.end()

    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

Sensor.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO sensor(type, bluetooth_identifier) VALUES($1, $2) RETURNING *;'
  const values = [this.data.type, this.data.bluetooth_identifier]

  pool.query(queryString, values, (err, res) => {
    pool.end()

    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = Sensor