/* MultiOs prismkernel — kprintf / klog / panic. Original code.
 * Freestanding formatter writing to VGA + COM1 serial.
 * Supported: %c %s %d %i %u %x %X %p %% with optional width + '0' pad + 'l'/'ll'.
 */
#include "kprint.h"
#include "vga.h"
#include "serial.h"
#include "ports.h"
#include "string.h"

#include <stdarg.h>

static void out_char(char c) {
    vga_putc(c);
    serial_putc(c);
}

static void out_str(const char *s, size_t n) {
    vga_write(s, n);
    serial_write(s, n);
}

static void out_pad(int count, char pad) {
    for (int i = 0; i < count; i++) {
        out_char(pad);
    }
}

static size_t fmt_uint(char *buf, size_t cap, unsigned long long v, int base, int upper) {
    const char *digits = upper ? "0123456789ABCDEF" : "0123456789abcdef";
    char tmp[64];
    size_t n = 0;
    if (v == 0) {
        tmp[n++] = '0';
    } else {
        while (v && n < sizeof(tmp)) {
            tmp[n++] = digits[v % (unsigned)base];
            v /= (unsigned)base;
        }
    }
    size_t out = 0;
    while (n > 0 && out < cap) {
        buf[out++] = tmp[--n];
    }
    return out;
}

static int kvprintf(const char *fmt, va_list ap) {
    int total = 0;
    for (const char *p = fmt; *p; p++) {
        if (*p != '%') {
            out_char(*p);
            total++;
            continue;
        }
        p++;
        if (*p == '%') {
            out_char('%');
            total++;
            continue;
        }
        char pad = ' ';
        int width = 0;
        if (*p == '0') {
            pad = '0';
            p++;
        }
        while (*p >= '0' && *p <= '9') {
            width = width * 10 + (*p - '0');
            p++;
        }
        int long_n = 0;
        while (*p == 'l') {
            long_n++;
            p++;
        }
        char spec = *p;
        if (!spec) {
            break;
        }
        char buf[64];
        size_t len = 0;
        int is_neg = 0;
        unsigned long long uval = 0;

        switch (spec) {
        case 'c': {
            int c = va_arg(ap, int);
            char ch = (char)c;
            out_char(ch);
            total++;
            break;
        }
        case 's': {
            const char *s = va_arg(ap, const char *);
            if (!s) {
                s = "(null)";
            }
            size_t sl = strlen(s);
            if (width > 0 && (int)sl < width) {
                out_pad(width - (int)sl, ' ');
                total += width - (int)sl;
            }
            out_str(s, sl);
            total += (int)sl;
            break;
        }
        case 'd':
        case 'i': {
            long long sval;
            if (long_n >= 2) {
                sval = va_arg(ap, long long);
            } else if (long_n == 1) {
                sval = va_arg(ap, long);
            } else {
                sval = va_arg(ap, int);
            }
            if (sval < 0) {
                is_neg = 1;
                uval = (unsigned long long)(-sval);
            } else {
                uval = (unsigned long long)sval;
            }
            len = fmt_uint(buf, sizeof(buf), uval, 10, 0);
            int need = (int)len + (is_neg ? 1 : 0);
            int padn = width > need ? width - need : 0;
            if (pad == '0') {
                if (is_neg) {
                    out_char('-');
                    total++;
                }
                out_pad(padn, '0');
                total += padn;
            } else {
                out_pad(padn, ' ');
                total += padn;
                if (is_neg) {
                    out_char('-');
                    total++;
                }
            }
            out_str(buf, len);
            total += (int)len;
            break;
        }
        case 'u': {
            if (long_n >= 2) {
                uval = va_arg(ap, unsigned long long);
            } else if (long_n == 1) {
                uval = va_arg(ap, unsigned long);
            } else {
                uval = va_arg(ap, unsigned int);
            }
            len = fmt_uint(buf, sizeof(buf), uval, 10, 0);
            int padn = width > (int)len ? width - (int)len : 0;
            out_pad(padn, pad);
            total += padn;
            out_str(buf, len);
            total += (int)len;
            break;
        }
        case 'x':
        case 'X': {
            if (long_n >= 2) {
                uval = va_arg(ap, unsigned long long);
            } else if (long_n == 1) {
                uval = va_arg(ap, unsigned long);
            } else {
                uval = va_arg(ap, unsigned int);
            }
            len = fmt_uint(buf, sizeof(buf), uval, 16, spec == 'X');
            int padn = width > (int)len ? width - (int)len : 0;
            out_pad(padn, pad);
            total += padn;
            out_str(buf, len);
            total += (int)len;
            break;
        }
        case 'p': {
            void *ptr = va_arg(ap, void *);
            uval = (unsigned long long)(u64)ptr;
            out_str("0x", 2);
            total += 2;
            len = fmt_uint(buf, sizeof(buf), uval, 16, 0);
            out_str(buf, len);
            total += (int)len;
            break;
        }
        default:
            out_char('%');
            out_char(spec);
            total += 2;
            break;
        }
    }
    return total;
}

int kprintf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    int n = kvprintf(fmt, ap);
    va_end(ap);
    return n;
}

int klog(const char *tag, const char *fmt, ...) {
    kprintf("[%s] ", tag);
    va_list ap;
    va_start(ap, fmt);
    int n = kvprintf(fmt, ap);
    va_end(ap);
    return n;
}

void panic(const char *msg) {
    cli();
    kprintf("\n*** PANIC: %s ***\nSystem halted.\n", msg ? msg : "unknown");
    for (;;) {
        hlt();
    }
}

void kputc(char c) { vga_putc(c); serial_putc(c); }

void kputs(const char *s) { if (s) { vga_puts(s); serial_puts(s); } }

