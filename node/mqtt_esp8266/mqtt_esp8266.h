

// Checks if motion was detected, sets LED HIGH and starts a timer
ICACHE_RAM_ATTR void sensorFn0();
ICACHE_RAM_ATTR void sensorFn1();
ICACHE_RAM_ATTR void sensorFn2();
ICACHE_RAM_ATTR void sensorFn3();
ICACHE_RAM_ATTR void sensorFn4();
ICACHE_RAM_ATTR void sensorFn5();
ICACHE_RAM_ATTR void sensorFn6();
ICACHE_RAM_ATTR void sensorFn7();
ICACHE_RAM_ATTR void sensorFn8();


void checkSensorTimingsResetAll();

void checkSensorTimingsReset(long &, long &, bool &);