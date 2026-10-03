/* MultiOs prismkernel — kernel heap (first-fit free list). Original code.
 * Arena grows by PMM pages (identity mapped, so phys == virt).
 */
#include "heap.h"
#include "pmm.h"
#include "kprint.h"
#include "string.h"

#define HEAP_MAGIC 0x70A5A5E1u
#define HEAP_ALIGN 16u

struct heap_block {
    u32 magic;
    u32 free;
    u64 size; /* usable bytes after header */
    struct heap_block *next;
    struct heap_block *prev;
};

static struct heap_block *g_head = NULL;
static u64 g_arena_bytes = 0;

static u64 align_up(u64 v, u64 a) {
    return (v + a - 1) & ~(a - 1);
}

static void *heap_grow_single_page(void) {
    return pmm_alloc_page();
}

static void block_insert(struct heap_block *b) {
    b->next = g_head;
    b->prev = NULL;
    if (g_head) {
        g_head->prev = b;
    }
    g_head = b;
}

static void heap_add_page(void *pg) {
    struct heap_block *b = (struct heap_block *)pg;
    b->magic = HEAP_MAGIC;
    b->free = 1;
    b->size = 4096 - sizeof(struct heap_block);
    b->next = NULL;
    b->prev = NULL;
    block_insert(b);
    g_arena_bytes += 4096;
}

void heap_init(void) {
    g_head = NULL;
    g_arena_bytes = 0;
    for (int i = 0; i < 64; i++) {
        void *pg = pmm_alloc_page();
        if (!pg) {
            break;
        }
        heap_add_page(pg);
    }
    /* Coalesce the initial run if pages happened to be contiguous. */
    struct heap_block *b = g_head;
    (void)b;
    klog("heap", "ready arena=%llu bytes\n", g_arena_bytes);
}

void *kmalloc(size_t n) {
    if (n == 0) {
        n = 1;
    }
    u64 need = align_up((u64)n, HEAP_ALIGN);
    struct heap_block *b = g_head;
    while (b) {
        if (b->magic != HEAP_MAGIC) {
            panic("heap corruption");
        }
        if (b->free && b->size >= need) {
            /* Split if remainder fits a new header + alignment. */
            u64 rem = b->size - need;
            if (rem > sizeof(struct heap_block) + HEAP_ALIGN) {
                u8 *nb_addr = (u8 *)(b + 1) + need;
                /* Align new header. */
                u64 off = align_up((u64)nb_addr, HEAP_ALIGN) - (u64)nb_addr;
                if (rem > sizeof(struct heap_block) + off + HEAP_ALIGN) {
                    struct heap_block *nb = (struct heap_block *)(nb_addr + off);
                    nb->magic = HEAP_MAGIC;
                    nb->free = 1;
                    nb->size = rem - sizeof(struct heap_block) - off;
                    nb->next = b->next;
                    nb->prev = b;
                    if (b->next) {
                        b->next->prev = nb;
                    }
                    b->next = nb;
                    b->size = need + off;
                }
            }
            b->free = 0;
            memset(b + 1, 0, (size_t)need);
            return (void *)(b + 1);
        }
        b = b->next;
    }
    /* Out of blocks: grow by pages until fit or OOM. */
    for (int i = 0; i < 16; i++) {
        void *pg = heap_grow_single_page();
        if (!pg) {
            break;
        }
        heap_add_page(pg);
    }
    /* Retry once. */
    b = g_head;
    while (b) {
        if (b->free && b->size >= need) {
            b->free = 0;
            return (void *)(b + 1);
        }
        b = b->next;
    }
    return NULL;
}

void kfree(void *p) {
    if (!p) {
        return;
    }
    struct heap_block *b = (struct heap_block *)p - 1;
    if (b->magic != HEAP_MAGIC) {
        klog("heap", "kfree bad pointer %p\n", p);
        return;
    }
    b->free = 1;
    /* Coalesce with next if contiguous + free. */
    if (b->next && b->next->free &&
        (u8 *)b + sizeof(struct heap_block) + b->size == (u8 *)b->next) {
        b->size += sizeof(struct heap_block) + b->next->size;
        struct heap_block *nn = b->next->next;
        b->next = nn;
        if (nn) {
            nn->prev = b;
        }
    }
    /* Coalesce with prev if contiguous + free. */
    if (b->prev && b->prev->free &&
        (u8 *)b->prev + sizeof(struct heap_block) + b->prev->size == (u8 *)b) {
        b->prev->size += sizeof(struct heap_block) + b->size;
        b->prev->next = b->next;
        if (b->next) {
            b->next->prev = b->prev;
        }
    }
}

void *kcalloc(size_t count, size_t size) {
    u64 total = (u64)count * (u64)size;
    void *p = kmalloc((size_t)total);
    if (p) {
        memset(p, 0, (size_t)total);
    }
    return p;
}

void *krealloc(void *old, size_t n) {
    if (!old) {
        return kmalloc(n);
    }
    if (n == 0) {
        kfree(old);
        return NULL;
    }
    struct heap_block *b = (struct heap_block *)old - 1;
    u64 oldsz = b->size;
    void *np = kmalloc(n);
    if (!np) {
        return NULL;
    }
    size_t cp = oldsz < n ? (size_t)oldsz : n;
    memcpy(np, old, cp);
    kfree(old);
    return np;
}

void heap_stats(u64 *total, u64 *used, u64 *free_bytes) {
    u64 t = g_arena_bytes, u = 0;
    for (struct heap_block *b = g_head; b; b = b->next) {
        if (!b->free) {
            u += b->size + sizeof(struct heap_block);
        }
    }
    if (total) {
        *total = t;
    }
    if (used) {
        *used = u;
    }
    if (free_bytes) {
        *free_bytes = t >= u ? t - u : 0;
    }
}
