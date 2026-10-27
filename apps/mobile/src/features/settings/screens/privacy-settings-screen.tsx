import { Typography } from "heroui-native";
import { SettingsContent, SettingsSection } from "@/features/settings/components/settings-content";
import { useText } from "@/shared/lib/text";

export function PrivacySettingsScreen() {
  const { t } = useText();
  return (
    <SettingsContent>
      <SettingsSection>
        <Typography.Paragraph>{t("mobile.settings.privacy.footer")}</Typography.Paragraph>
      </SettingsSection>
    </SettingsContent>
  );
}
