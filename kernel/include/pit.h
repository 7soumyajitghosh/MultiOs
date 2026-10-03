#ifndef MOS_PIT_H
#define MOS_PIT_H

#include "types.h"

void pit_init(u32 hz);
u64 pit_ticks(void);
u64 pit_hz(void);
u64 pit_uptime_ms(void);
void pit_on_tick(void);
void pit_wait_ms(u64 ms);

#endif
