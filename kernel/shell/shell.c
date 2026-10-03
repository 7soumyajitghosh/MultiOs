/* MultiOs prismsh - built-in shell. Original code.
 * Commands: help/clear/info/mem/uptime/echo/logo/browser/halt/reboot
 */
#include "shell.h"
#include "vga.h"
#include "keyboard.h"
#include "kprint.h"
#include "serial.h"
#include "string.h"
#include "pmm.h"
#include "heap.h"
#include "pit.h"
#include "multiboot2.h"
#include "ports.h"

extern struct mos_bootinfo g_bootinfo;

#define SHELL_LINE_MAX 256

static const char *g_logo[] = {
    "      ____",
    "     / __ \\___  _______  ______ ___",
    "    / /_/ / _ \\/ ___/ / / / __ `__ \\",
    "   / ____/  __/ /  / /_/ / / / / / /",
    "  /_/    \\___/_/   \\__,_/_/ /_/ /_/",
    "",
    "   /\\  /\\  /\\  Prism Dusk  /\\  /\\  /\\",
    "  /  \\/  \\/  \\____________/  \\/  \\/  \\",
    NULL,
};

static void print_logo(void) {
    u8 fg, bg;
    vga_get_color(&fg, &bg);
    vga_set_color(VGA_LIGHT_CYAN, bg);
    kprintf("   ____  ___  ___  ____  __  __\n");
    kprintf("  / __ \\/ _ \\/ __|  _ \\/  \\/  \\\n");
    kprintf(" | | | |  __/\\__ \\ | | | |\\/| |\n");
    kprintf(" |_| |_|\\___||___/_| |_|_|  |_|\n");
    vga_set_color(VGA_YELLOW, bg);
    kprintf("  Prism Dusk -- Void Navy #0B1026\n");
    vga_set_color(fg, bg);
    (void)g_logo;
}

static void cmd_help(void) {
    kprintf("prismsh commands:\n");
    kprintf("  help          this list\n");
    kprintf("  clear         clear screen\n");
    kprintf("  info          system info\n");
    kprintf("  mem           memory stats\n");
    kprintf("  uptime        ticks + seconds\n");
    kprintf("  echo <text>   print text\n");
    kprintf("  logo          show Prism logo\n");
    kprintf("  browser       Prism Browser status (native GUI roadmap)\n");
    kprintf("  halt          halt CPU\n");
    kprintf("  reboot        reboot via 8042\n");
}

static void cmd_browser(void) {
    kprintf("Prism Browser 0.1.0 (Brave-like privacy model, original code)\n");
    kprintf("  native: requires netstack + framebuffer GUI (roadmap:\n");
    kprintf("    VMM/syscalls -> AHCI/VirtIO+mfs -> user mode/ELF -> GUI).\n");
    kprintf("  desktop demo: open Aurora Browser in the Aurora Desktop UI\n");
    kprintf("    (Shields, private tabs, Prism Search, Rewards, Wallet).\n");
    kprintf("  text-mode stub: no TCP/IP or renderer in prismkernel yet.\n");
}

static void cmd_info(void) {
    kprintf("MultiOs 0.1.0 \"Prism\" -- prismkernel\n");
    kprintf("arch: x86_64  boot: Multiboot2 via GRUB\n");
    if (g_bootinfo.bootloader) {
        kprintf("bootloader: %s\n", g_bootinfo.bootloader);
    }
    kprintf("mem lower: %u KB  upper: %u KB\n",
            g_bootinfo.mem_lower_kb, g_bootinfo.mem_upper_kb);
}

static void cmd_mem(void) {
    kprintf("pmm: total=%llu pages (%llu KB) free=%llu used=%llu\n",
            pmm_total_pages(), pmm_total_bytes() / 1024,
            pmm_free_pages(), pmm_used_pages());
    u64 ht, hu, hf;
    heap_stats(&ht, &hu, &hf);
    kprintf("heap: arena=%llu used=%llu free=%llu\n", ht, hu, hf);
}

static void cmd_uptime(void) {
    kprintf("ticks=%llu uptime=%llu ms (%llu s)\n",
            pit_ticks(), uptime_ms(), uptime_sec());
}

static void cmd_echo(const char *args) {
    if (args) {
        kprintf("%s\n", args);
    } else {
        kprintf("\n");
    }
}

static void do_reboot(void) {
    kprintf("rebooting...\n");
    for (volatile int i = 0; i < 1000000; i++) {
    }
    /* 8042 reset pulse. */
    u8 good = 0x02;
    while ((good & 0x02) != 0) {
        good = inb(0x64);
    }
    outb(0x64, 0xFE);
    for (;;) {
        cli();
        hlt();
    }
}

static const char *skip_spaces(const char *s) {
    while (*s == ' ' || *s == '\t') {
        s++;
    }
    return s;
}

static void exec_line(char *line) {
    const char *p = skip_spaces(line);
    if (*p == 0) {
        return;
    }
    /* Split verb + args. */
    char *space = (char *)p;
    while (*space && *space != ' ' && *space != '\t') {
        space++;
    }
    const char *args = NULL;
    if (*space) {
        *space = 0;
        args = skip_spaces(space + 1);
        if (*args == 0) {
            args = NULL;
        }
    }

    if (strcmp(p, "help") == 0) {
        cmd_help();
    } else if (strcmp(p, "clear") == 0) {
        vga_clear();
    } else if (strcmp(p, "info") == 0) {
        cmd_info();
    } else if (strcmp(p, "mem") == 0) {
        cmd_mem();
    } else if (strcmp(p, "uptime") == 0) {
        cmd_uptime();
    } else if (strcmp(p, "echo") == 0) {
        cmd_echo(args);
    } else if (strcmp(p, "logo") == 0) {
        print_logo();
    } else if (strcmp(p, "browser") == 0) {
        cmd_browser();
    } else if (strcmp(p, "halt") == 0) {
        kprintf("halted. (reset QEMU to restart)\n");
        for (;;) {
            cli();
            hlt();
        }
    } else if (strcmp(p, "reboot") == 0) {
        do_reboot();
    } else {
        kprintf("prismsh: unknown command '%s' (type `help`)\n", p);
    }
}

/* Single input source for the line editor: COM1 first, then the PS/2
 * keyboard. Both are polled without blocking so a headless shell driven
 * over serial works exactly like one driven from a real keyboard.
 * Returns -1 when neither device has a byte pending. */
static int read_input(void) {
    int c = serial_getc();
    if (c != SERIAL_NO_INPUT) {
        return c;
    }
    return keyboard_getc();
}

void shell_run(void) {
    char line[SHELL_LINE_MAX];
    size_t len = 0;

    kprintf("[shell] type `help`\n");
    for (;;) {
        kprintf("multios> ");
        len = 0;
        memset(line, 0, sizeof(line));
        for (;;) {
            int rc = read_input();
            if (rc == SERIAL_NO_INPUT) {
                /* Nothing pending on either console: yield until the next
                 * interrupt (timer tick / keyboard IRQ1) so we do not spin. */
                hlt();
                continue;
            }
            char c = (char)rc;
            if (c == '\n') {
                vga_putc('\n');
                serial_putc('\n');
                break;
            }
            if (c == '\b') {
                if (len > 0) {
                    len--;
                    line[len] = 0;
                    vga_putc('\b');
                    serial_putc('\b');
                }
                continue;
            }
            if (len + 1 < sizeof(line)) {
                line[len++] = c;
                line[len] = 0;
                vga_putc(c);
                serial_putc(c);
            } else {
                /* Buffer full: beep via serial (bell character) */
                serial_putc('\a');
            }
        }
        exec_line(line);
    }
}
