var schemas = require("./schemas.js")
var _ = require("lodash")

var Room = function (data) {
  this.data = this.sanitize(data)
}

Room.prototype.data = {}

Room.prototype.get = function (attr) {
  return this.data[attr]
}

Room.prototype.set = function (attr, value) {
  this.data[attr] = value
}

Room.prototype.sanitize = function (data) {
  data = data || {}
  schema = schemas.sensor
  return _.pick(_.defaults(data, schema), _.keys(schema))
}


// Helper functions

Room.findById = function (id, callback) {
  const queryString = 'SELECT * FROM room WHERE id = $1;'
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

Room.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO room(type) VALUES($1) RETURNING *;'
  const values = [this.data.type]

  pool.query(queryString, values, (err, res) => {
    pool.end()

    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

module.exports = Room