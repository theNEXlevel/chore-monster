import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface ChildInvitationTemplateProps {
  childName: string;
  parentName: string;
  inviteUrl: string;
}

export const ChildInvitationTemplate: React.FC<
  Readonly<ChildInvitationTemplateProps>
> = ({ childName, parentName, inviteUrl }) => (
  <Html>
    <Preview>Join Chore Monster with {parentName}</Preview>
    <Body>
      <Container>
        <Heading>Welcome to Chore Monster, {childName}!</Heading>
        <Text>
          {parentName} invited you to join Chore Monster. Set up your account to
          start managing your chores and rewards.
        </Text>
        <Button href={inviteUrl}>Set up your account</Button>
        <Text>This invitation link expires in seven days.</Text>
      </Container>
    </Body>
  </Html>
);
