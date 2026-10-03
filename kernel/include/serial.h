#ifndef MOS_SERIAL_H
#define MOS_SERIAL_H

#include "types.h"

/* Returned by serial_getc() when no byte is waiting. */
#define SERIAL_NO_INPUT (-1)

void serial_init(void);
int  serial_ready(void);          /* transmit holding register empty */
int  serial_can_read(void);       /* receive data register holds a byte */
int  serial_getc(void);           /* non-blocking read; SERIAL_NO_INPUT if none */
void serial_putc(char c);
void serial_write(const char *s, size_t n);
void serial_puts(const char *s);

#endif
