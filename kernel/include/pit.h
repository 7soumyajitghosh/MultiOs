#ifndef MOS_PIT_H
#define MOS_PIT_H

#include "types.h"

void pit_init(u32 hz);
void pit_tick_handler(void);
void pit_tick(void);
void pit_on_tick(void);
u64  pit_ticks(void);
u64  pit_hz(void);
u64  uptime_ms(void);
u64  uptime_sec(void);
u64  pit_uptime_ms(void);
u64  pit_uptime_sec(void);
void pit_wait_ms(u64 ms);

#endif
