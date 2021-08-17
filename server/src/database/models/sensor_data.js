/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sensorData', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    sensorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'sensor',
        key: 'sensor_id'
      },
      field: 'sensor_id'
    },
    chan: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'chan'
    },
    value: {
      type: "DOUBLE",
      allowNull: true,
      field: 'value'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'timestamp'
    }
  }, {
    tableName: 'sensor_data'
  });
};
