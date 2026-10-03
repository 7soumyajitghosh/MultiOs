#ifndef MOS_KEYBOARD_H
#define MOS_KEYBOARD_H

void keyboard_init(void);
/* Non-blocking: returns -1 if empty, else 0..255 ASCII (or special >= 0). */
int keyboard_getc(void);
/* Blocking poll with hlt. */
char keyboard_getc_blocking(void);

#endif
