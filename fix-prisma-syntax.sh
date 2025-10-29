#!/bin/bash

# Fix clients/[id]/route.ts
sed -i 's/await prisma.client.findUnique(id)/await prisma.client.findUnique({ where: { id } })/g' "app/api/clients/[id]/route.ts"
sed -i 's/await prisma.test.findMany({ clientId: id })/await prisma.test.findMany({ where: { clientId: id }, include: { testStages: { orderBy: { sequence: "asc" } } } })/g' "app/api/clients/[id]/route.ts"
sed -i 's/await prisma.client.update(id, updateData)/await prisma.client.update({ where: { id }, data: updateData })/g' "app/api/clients/[id]/route.ts"
sed -i 's/await prisma.client.delete(id)/await prisma.client.delete({ where: { id } })/g' "app/api/clients/[id]/route.ts"

# Fix tests/[id]/route.ts
sed -i 's/await prisma.test.findUnique(id)/await prisma.test.findUnique({ where: { id }, include: { testStages: { orderBy: { sequence: "asc" } }, client: true } })/g' "app/api/tests/[id]/route.ts"
sed -i 's/await prisma.client.findUnique(test.clientId)/await prisma.client.findUnique({ where: { id: test.clientId } })/g' "app/api/tests/[id]/route.ts"
sed -i 's/await prisma.test.update(id, updateData)/await prisma.test.update({ where: { id }, data: updateData })/g' "app/api/tests/[id]/route.ts"
sed -i 's/await prisma.test.delete(id)/await prisma.test.delete({ where: { id } })/g' "app/api/tests/[id]/route.ts"

echo "Prisma syntax fixed!"
