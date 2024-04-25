import React from 'react';
import { ConfirmDialog, ConfirmDialogProps } from '@src/components/ConfirmDialog';
import { FavoritesList } from './FavoritesList';

interface FavoritesDialogProps extends Omit<ConfirmDialogProps, 'content' | 'title'> { }

export function FavoritesDialog({ children, ...props }: FavoritesDialogProps) {
  return <ConfirmDialog title="Favorites" content={<FavoritesList></FavoritesList>}>
    {children}
  </ConfirmDialog>
}