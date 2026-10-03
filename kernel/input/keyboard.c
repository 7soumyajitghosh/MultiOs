/* MultiOs prismkernel — PS/2 keyboard, Set-1 translation. Original table.
 * IRQ1, ring buffer, Shift/Caps handling. Scancode values are hardware facts.
 */
#include "keyboard.h"
#include "ports.h"
#include "pic.h"

#define KBD_DATA 0x60
#define KBD_STATUS 0x64

#define KBUF_SIZE 256

static char g_buf[KBUF_SIZE];
static volatile u32 g_head = 0;
static volatile u32 g_tail = 0;
static int g_shift = 0;
static int g_caps = 0;
static int g_escaped = 0;

/* Set-1 make codes -> ASCII (unshifted / shifted). 0 = non-printable. */
static const char g_map[128] = {
    0, 0, '1', '2', '3', '4', '5', '6',           /* 0x00-0x07 */
    '7', '8', '9', '0', '-', '=', '\b', '\t',     /* 0x08-0x0F */
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i',       /* 0x10-0x17 */
    'o', 'p', '[', ']', '\n', 0, 'a', 's',        /* 0x18-0x1F */
    'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',       /* 0x20-0x27 */
    '\'', '`', 0, '\\', 'z', 'x', 'c', 'v',       /* 0x28-0x2F */
    'b', 'n', 'm', ',', '.', '/', 0, '*',         /* 0x30-0x37 */
    0, ' ', 0, 0, 0, 0, 0, 0,                     /* 0x38-0x3F */
    0, 0, 0, 0, 0, 0, 0, '7',                     /* 0x40-0x47 */
    '8', '9', '-', '4', '5', '6', '+', '1',       /* 0x48-0x4F */
    '2', '3', '0', '.', 0, 0, 0, 0,               /* 0x50-0x57 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x58-0x5F */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x60-0x67 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x68-0x6F */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x70-0x77 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x78-0x7F */
};

static const char g_map_shift[128] = {
    0, 0, '!', '@', '#', '$', '%', '^',           /* 0x00-0x07 */
    '&', '*', '(', ')', '_', '+', '\b', '\t',     /* 0x08-0x0F */
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I',       /* 0x10-0x17 */
    'O', 'P', '{', '}', '\n', 0, 'A', 'S',        /* 0x18-0x1F */
    'D', 'F', 'G', 'H', 'J', 'K', 'L', ':',       /* 0x20-0x27 */
    '"', '~', 0, '|', 'Z', 'X', 'C', 'V',         /* 0x28-0x2F */
    'B', 'N', 'M', '<', '>', '?', 0, '*',         /* 0x30-0x37 */
    0, ' ', 0, 0, 0, 0, 0, 0,                     /* 0x38-0x3F */
    0, 0, 0, 0, 0, 0, 0, '7',                     /* 0x40-0x47 */
    '8', '9', '-', '4', '5', '6', '+', '1',       /* 0x48-0x4F */
    '2', '3', '0', '.', 0, 0, 0, 0,               /* 0x50-0x57 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x58-0x5F */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x60-0x67 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x68-0x6F */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x70-0x77 */
    0, 0, 0, 0, 0, 0, 0, 0,                       /* 0x78-0x7F */
};

static void buf_push(char c) {
    u32 next = (g_head + 1) % KBUF_SIZE;
    if (next == g_tail) {
        return; /* full: drop */
    }
    g_buf[g_head] = c;
    g_head = next;
}

void keyboard_init(void) {
    g_head = 0;
    g_tail = 0;
    g_shift = 0;
    g_caps = 0;
    g_escaped = 0;
    /* Flush pending output. */
    while ((inb(KBD_STATUS) & 0x01) != 0) {
        (void)inb(KBD_DATA);
    }
    pic_set_mask(1, 0); /* unmask IRQ1 */
}

void keyboard_irq_handler(void) {
    u8 st = inb(KBD_STATUS);
    if ((st & 0x01) == 0) {
        return;
    }
    u8 code = inb(KBD_DATA);

    if (code == 0xE0) {
        g_escaped = 1;
        return;
    }
    if (g_escaped) {
        g_escaped = 0;
        /* Ignore extended keys (arrows etc.) in the prototype. */
        return;
    }

    int released = (code & 0x80) != 0;
    u8 make = (u8)(code & 0x7F);

    if (make == 0x2A || make == 0x36) {
        g_shift = released ? 0 : 1;
        return;
    }
    if (make == 0x3A && !released) {
        g_caps = !g_caps;
        return;
    }
    if (released) {
        return;
    }
    if (make >= 128) {
        return;
    }
    char c = g_shift ? g_map_shift[make] : g_map[make];
    if (!c) {
        return;
    }
    /* Caps affects letters only. */
    if (g_caps && c >= 'a' && c <= 'z') {
        c = (char)(c - 'a' + 'A');
    } else if (g_caps && g_shift && c >= 'A' && c <= 'Z') {
        c = (char)(c - 'A' + 'a');
    }
    buf_push(c);
}

int keyboard_has_data(void) {
    return g_head != g_tail;
}

int keyboard_getc(void) {
    if (g_head == g_tail) {
        return -1;
    }
    char c = g_buf[g_tail];
    g_tail = (g_tail + 1) % KBUF_SIZE;
    return (unsigned char)c;
}

char keyboard_getc_blocking(void) {
    for (;;) {
        if (keyboard_has_data()) {
            return (char)keyboard_getc();
        }
        __asm__ volatile ("sti; hlt");
    }
}

void keyboard_irq(void){keyboard_irq_handler();}
int keyboard_has_key(void){return keyboard_has_data();}
int keyboard_try_getc(void){return keyboard_getc();}

