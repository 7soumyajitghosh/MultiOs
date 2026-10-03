/* MultiOs prismkernel — physical page allocator. Original code.
 * Bitmap over up to 4 GiB (1M pages of 4 KiB = 128 KiB bitmap).
 * Allocation is restricted to the 1 GiB identity window (prototype).
 */
#include "pmm.h"
#include "kprint.h"
#include "string.h"

#define PAGE_SIZE 4096u
#define MAX_PAGES (1024u * 1024u)      /* 4 GiB / 4 KiB */
#define BITMAP_BYTES (MAX_PAGES / 8u)  /* 128 KiB */
#define IDENT_LIMIT (0x40000000ull)    /* 1 GiB identity map */

extern u8 _kernel_start[];
extern u8 _kernel_end[];

static u8 g_bitmap[BITMAP_BYTES];
static u64 g_total = 0;
static u64 g_free = 0;

static void bit_set(u64 page) {
    g_bitmap[page / 8] |= (u8)(1u << (page % 8));
}

static void bit_clear(u64 page) {
    g_bitmap[page / 8] &= (u8)~(1u << (page % 8));
}

static int bit_test(u64 page) {
    return (g_bitmap[page / 8] >> (page % 8)) & 1;
}

static void mark_range(u64 base, u64 len, int free) {
    if (len == 0) {
        return;
    }
    u64 start = base & ~0xFFFULL;
    u64 end = (base + len + 0xFFFULL) & ~0xFFFULL;
    for (u64 a = start; a < end; a += PAGE_SIZE) {
        u64 page = a / PAGE_SIZE;
        if (page >= MAX_PAGES) {
            break;
        }
        if (free) {
            if (bit_test(page)) {
                bit_clear(page);
                g_free++;
            }
        } else {
            if (!bit_test(page)) {
                bit_set(page);
                if (g_free > 0) {
                    g_free--;
                }
            }
        }
    }
}

void pmm_init(struct mos_bootinfo *bi) {
    /* Start: everything used. */
    memset(g_bitmap, 0xFF, sizeof(g_bitmap));
    g_total = 0;
    g_free = 0;

    if (bi && bi->mmap) {
        struct mb2_mmap_tag *tag = bi->mmap;
        u8 *p = (u8 *)&tag->entries[0];
        u8 *end = (u8 *)tag + tag->size;
        u32 es = tag->entry_size;
        if (es < sizeof(struct mb2_mmap_entry)) {
            es = (u32)sizeof(struct mb2_mmap_entry);
        }
        while (p + sizeof(struct mb2_mmap_entry) <= end) {
            struct mb2_mmap_entry *e = (struct mb2_mmap_entry *)p;
            if (e->type == MB2_MMAP_USABLE && e->length > 0) {
                /* Count + free usable pages below 4 GiB. */
                u64 base = e->base;
                u64 len = e->length;
                if (base >= (u64)MAX_PAGES * PAGE_SIZE) {
                    /* skip */
                } else {
                    if (base + len > (u64)MAX_PAGES * PAGE_SIZE) {
                        len = (u64)MAX_PAGES * PAGE_SIZE - base;
                    }
                    u64 start = (base + 0xFFFULL) & ~0xFFFULL;
                    u64 finish = (base + len) & ~0xFFFULL;
                    if (finish > start) {
                        g_total += (finish - start) / PAGE_SIZE;
                    }
                    mark_range(base, len, 1);
                }
            }
            if (es == 0) {
                break;
            }
            p += es;
        }
    } else {
        /* No mmap: fall back to 128 MiB above 1 MiB (emergency only). */
        g_total = (128u * 1024u * 1024u) / PAGE_SIZE;
        mark_range(0x100000, 128u * 1024u * 1024u, 1);
    }

    /* Reserve: low 1 MiB + kernel image. */
    mark_range(0, 0x100000, 0);
    u64 ks = (u64)_kernel_start;
    u64 ke = (u64)_kernel_end;
    if (ke > ks) {
        mark_range(ks, ke - ks, 0);
    }

    /* Reserve the Multiboot2 information block. GRUB allocates it from its
     * own pool, which is not described by the memory map, so nothing above
     * covers it. Without this the first kmalloc page handed out lands on it
     * and memset zeroes tags (e.g. the bootloader name) while still in use. */
    if (bi && bi->info_total) {
        mark_range(bi->info_base, bi->info_total, 0);
    }

    klog("memory", "map parsed total=%llu free=%llu pages\n", g_total, g_free);
}

void *pmm_alloc_page(void) {
    u64 limit_pages = IDENT_LIMIT / PAGE_SIZE;
    if (limit_pages > MAX_PAGES) {
        limit_pages = MAX_PAGES;
    }
    for (u64 i = 0; i < limit_pages; i++) {
        if (!bit_test(i)) {
            bit_set(i);
            if (g_free > 0) {
                g_free--;
            }
            void *ptr = (void *)(i * PAGE_SIZE);
            memset(ptr, 0, PAGE_SIZE);
            return ptr;
        }
    }
    return NULL;
}

void pmm_free_page(void *page) {
    u64 addr = (u64)page;
    if (addr & 0xFFFULL) {
        return;
    }
    u64 i = addr / PAGE_SIZE;
    if (i >= MAX_PAGES) {
        return;
    }
    if (bit_test(i)) {
        bit_clear(i);
        g_free++;
    }
}

u64 pmm_total_pages(void) {
    return g_total;
}

u64 pmm_free_pages(void) {
    return g_free;
}

u64 pmm_used_pages(void) {
    return g_total >= g_free ? g_total - g_free : 0;
}

u64 pmm_total_bytes(void) {
    return g_total * PAGE_SIZE;
}

u64 pmm_free_bytes(void) {
    return g_free * PAGE_SIZE;
}
