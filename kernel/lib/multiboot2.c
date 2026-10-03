/* MultiOs prismkernel — Multiboot2 info parsing. Original code.
 * Offsets follow the Multiboot2 spec (magic 0x36D76289 is a fact).
 */
#include "multiboot2.h"
#include "string.h"

void mb2_parse(u32 info_addr, struct mos_bootinfo *out) {
    memset(out, 0, sizeof(*out));
    if (!info_addr || !out) {
        return;
    }
    u8 *base = (u8 *)(u64)info_addr;
    u32 total = *(u32 *)base;
    u8 *p = base + 8;
    u8 *end = base + total;

    out->info_base = (u64)(u64)base;
    out->info_total = total;

    while (p + 8 <= end) {
        u32 type = *(u32 *)(p + 0);
        u32 size = *(u32 *)(p + 4);
        if (size < 8) {
            break;
        }
        if (type == MB2_TAG_END) {
            break;
        }
        if (type == MB2_TAG_BOOTLOADER && size > 8) {
            out->bootloader = (const char *)(p + 8);
        } else if (type == MB2_TAG_MEMINFO && size >= 16) {
            out->mem_lower_kb = *(u32 *)(p + 8);
            out->mem_upper_kb = *(u32 *)(p + 12);
        } else if (type == MB2_TAG_MMAP && size >= 16) {
            out->mmap = (struct mb2_mmap_tag *)p;
            out->mmap_bytes = size;
        }
        /* Tags are 8-byte aligned. */
        u32 step = (size + 7u) & ~7u;
        if (step == 0) {
            break;
        }
        p += step;
    }
}
