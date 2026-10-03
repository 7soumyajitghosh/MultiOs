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

int serial_can_read(void) {
    /* Line Status Register bit 0 (DR): receive data register holds a byte. */
    return (inb(COM1 + 5) & 0x01) != 0;
}

int serial_getc(void) {
    if (!serial_can_read()) {
        return SERIAL_NO_INPUT;
    }
    /* LSR bits 1..3 = overrun / framing / parity error. A byte flagged as
     * bad is consumed and discarded so the next read is still aligned. */
    u8 lsr = inb(COM1 + 5);
    u8 c = inb(COM1);
    if (lsr & 0x0E) {
        return SERIAL_NO_INPUT;
    }
    /* Terminals send CR for Enter; the shell line editor expects LF. */
    if (c == 0x0D) {
        c = 0x0A;
    }
    return (int)c;
}

void serial_putc(char c) {
    if (c == '\n') {
        serial_putc('\r');
    }
    while (!serial_ready()) {}
    outb(COM1, (u8)c);
}

void serial_write(const char *s, size_t n) {
    for (size_t i = 0; i < n; i++) serial_putc(s[i]);
}

void serial_puts(const char *s) {
    while (*s) serial_putc(*s++);
}
