---
title: What is the difference between preorder, inorder, and postorder traversal?
description: Compare visit order and common use cases for the three binary-tree traversals.
tags: [Data Structures, Binary Tree, Algorithms]
difficulty: easy
source: Handcrafted
---

## Visit order

- **Preorder**: root → left → right
- **Inorder**: left → root → right
- **Postorder**: left → right → root

## Common uses

Inorder traversal of a BST yields sorted values. Postorder is useful when children must be processed before the parent, such as deleting nodes.
