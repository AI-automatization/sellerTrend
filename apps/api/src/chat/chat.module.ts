import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { SignalsModule } from '../signals/signals.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { AiModule } from '../ai/ai.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatClassifierService } from './chat-classifier.service';
import { ChatRetrieverService } from './chat-retriever.service';

@Module({
  imports: [ProductsModule, SignalsModule, DiscoveryModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService, ChatClassifierService, ChatRetrieverService],
})
export class ChatModule {}
