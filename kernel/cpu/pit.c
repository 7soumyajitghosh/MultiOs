/* MultiOs prismkernel — 8253/8254 PIT timer. Original code.
 * Channel 0, mode 3 (square wave), 100 Hz default.
 */
#include "pit.h"
#include "ports.h"

#define PIT_CH0 0x40
#define PIT_CMD 0x43
#define PIT_HZ  1193182u

static volatile u64 g_ticks = 0;
static u32 g_freq = 100;

void pit_init(u32 hz) {
    if (hz == 0) {
        hz = 100;
    }
    g_freq = hz;
    g_ticks = 0;
    u32 div = PIT_HZ / hz;
    if (div == 0) {
        div = 1;
    }
    if (div > 65535) {
        div = 65535;
    }
    outb(PIT_CMD, 0x36);
    outb(PIT_CH0, (u8)(div & 0xFF));
    outb(PIT_CH0, (u8)((div >> 8) & 0xFF));
}

void pit_tick_handler(void) {
    g_ticks++;
}

void pit_tick(void) {
    pit_tick_handler();
}

void pit_on_tick(void) {
    pit_tick_handler();
}

u64 pit_ticks(void) {
    return g_ticks;
}

u64 pit_hz(void) {
    return g_freq;
}

u64 uptime_ms(void) {
    return (g_ticks * 1000u) / g_freq;
}

u64 uptime_sec(void) {
    return g_ticks / g_freq;
}

u64 pit_uptime_ms(void) {
    return uptime_ms();
}

u64 pit_uptime_sec(void) {
    return uptime_sec();
}

void pit_wait_ms(u64 ms) {
    u64 end = uptime_ms() + ms;
    while (uptime_ms() < end) {
        __asm__ volatile ("hlt");
    }
}
