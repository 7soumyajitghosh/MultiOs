#include "serial.h"
#include "ports.h"

#define COM1 0x3F8u

void serial_init(void) {
    outb(COM1 + 1, 0x00);   // disable interrupts
    outb(COM1 + 3, 0x80);   // enable DLAB
    outb(COM1 + 0, 0x03);   // divisor low: 38400 baud (115200/3)
    outb(COM1 + 1, 0x00);   // divisor high
    outb(COM1 + 3, 0x03);   // 8N1
    outb(COM1 + 2, 0xC7);   // FIFO enable + clear + 14-byte threshold
    outb(COM1 + 4, 0x0B);   // IRQs + RTS/DSR set
}

int serial_ready(void) {
    return (inb(COM1 + 5) & 0x20) != 0;
}

void serial_putc(char c) {
    if (c == '\n') serial_putc('\r');
    while (!serial_ready()) {}
    outb(COM1, (u8)c);
}

void serial_write(const char *s, size_t n) {
    for (size_t i = 0; i < n; i++) serial_putc(s[i]);
}

void serial_puts(const char *s) {
    while (*s) serial_putc(*s++);
}
