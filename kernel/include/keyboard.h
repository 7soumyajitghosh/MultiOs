#ifndef MOS_KEYBOARD_H
#define MOS_KEYBOARD_H

void keyboard_init(void);
void keyboard_irq_handler(void);
int  keyboard_has_data(void);
/* Non-blocking: returns -1 if empty, else 0..255 ASCII. */
int  keyboard_getc(void);
/* Blocking poll with hlt. */
char keyboard_getc_blocking(void);

#endif
