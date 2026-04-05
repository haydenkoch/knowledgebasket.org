import { Drawer as DrawerPrimitive } from 'vaul-svelte';
import Root from './drawer.svelte';
import Content from './drawer-content.svelte';
import Header from './drawer-header.svelte';
import Footer from './drawer-footer.svelte';

export {
	Root,
	Content,
	Header,
	Footer,
	DrawerPrimitive as Primitive,
	DrawerPrimitive as Drawer,
	Root as DrawerRoot,
	Content as DrawerContent,
	Header as DrawerHeader,
	Footer as DrawerFooter,
	DrawerPrimitive as DrawerPrimitiveNamespace
};

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;
export const DrawerClose = DrawerPrimitive.Close;
