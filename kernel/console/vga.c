#include "vga.h"
#include "ports.h"
#include "string.h"

#define VGA_COLS 80
#define VGA_ROWS 25
#define VGA_BUF ((volatile u16 *)0xB8000)

static u16 cursor_row = 0;
static u16 cursor_col = 0;
static u8 cur_fg = VGA_LIGHT_GREY;
static u8 cur_bg = VGA_BLACK;

static inline u16 vga_entry(char c, u8 fg, u8 bg) {
    return (u16)c | ((u16)((fg | (bg << 4)) << 8));
}

static void vga_update_cursor(void) {
    u16 pos = cursor_row * VGA_COLS + cursor_col;
    outb(0x3D4, 0x0F);
    outb(0x3D5, (u8)(pos & 0xFF));
    outb(0x3D4, 0x0E);
    outb(0x3D5, (u8)((pos >> 8) & 0xFF));
}

static void vga_scroll(void) {
    if (cursor_row < VGA_ROWS) return;
    for (u16 r = 0; r < VGA_ROWS - 1; r++) {
        for (u16 c = 0; c < VGA_COLS; c++) {
            VGA_BUF[r * VGA_COLS + c] = VGA_BUF[(r + 1) * VGA_COLS + c];
        }
    }
    u16 blank = vga_entry(' ', cur_fg, cur_bg);
    for (u16 c = 0; c < VGA_COLS; c++) {
        VGA_BUF[(VGA_ROWS - 1) * VGA_COLS + c] = blank;
    }
    cursor_row = VGA_ROWS - 1;
}

void vga_init(void) {
    cur_fg = VGA_LIGHT_GREY;
    cur_bg = VGA_BLUE;
    vga_clear();
    /* Prism Dusk echo: blue background, light text. */
    cur_fg = 0xE2E8F0 & 0xF;
    cur_fg = VGA_LIGHT_GREY;
    cur_bg = VGA_BLACK;
    vga_update_cursor();
}

void vga_clear(void) {
    u16 blank = vga_entry(' ', cur_fg, cur_bg);
    for (int i = 0; i < VGA_COLS * VGA_ROWS; i++) VGA_BUF[i] = blank;
    cursor_row = 0;
    cursor_col = 0;
    vga_update_cursor();
}

void vga_set_color(u8 fg, u8 bg) {
    cur_fg = fg & 0x0F;
    cur_bg = bg & 0x0F;
}

void vga_get_color(u8 *fg, u8 *bg) {
    if (fg) *fg = cur_fg;
    if (bg) *bg = cur_bg;
}

void vga_putc(char c) {
    if (c == '\n') {
        cursor_col = 0;
        cursor_row++;
        vga_scroll();
        vga_update_cursor();
        return;
    }
    if (c == '\r') {
        cursor_col = 0;
        vga_update_cursor();
        return;
    }
    if (c == '\b') {
        if (cursor_col > 0) {
            cursor_col--;
            VGA_BUF[cursor_row * VGA_COLS + cursor_col] = vga_entry(' ', cur_fg, cur_bg);
            vga_update_cursor();
        }
        return;
    }
    if (c == '\t') {
        for (int i = 0; i < 4; i++) vga_putc(' ');
        return;
    }
    VGA_BUF[cursor_row * VGA_COLS + cursor_col] = vga_entry(c, cur_fg, cur_bg);
    cursor_col++;
    if (cursor_col >= VGA_COLS) {
        cursor_col = 0;
        cursor_row++;
    }
    vga_scroll();
    vga_update_cursor();
}

void vga_puts(const char *s) {
    vga_write(s, strlen(s));
}

void vga_write(const char *s, size_t n) {
    for (size_t i = 0; i < n; i++) vga_putc(s[i]);
}
