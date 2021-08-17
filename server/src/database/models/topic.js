/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('topic', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    code: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      unique: true,
      field: 'code'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'name'
    },
    logRate: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'log_rate'
    }
  }, {
    tableName: 'topic'
  });
};
